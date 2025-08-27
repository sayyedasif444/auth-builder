const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Token = require('../models/Token');
const { auth, requireSuperUser } = require('../middleware/auth');
const Client = require('../models/Client');
const Otp = require('../models/Otp');
const EmailService = require('../services/emailService');
const Role = require('../models/Role');

const router = express.Router();

// Client login endpoint - allows login with just client ID
router.post('/client-login', [
  body('client_id').isString().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { client_id } = req.body;

    // Find client by client_id
    const client = await Client.findByClientId(client_id);
    if (!client) {
      return res.status(401).json({ error: 'Invalid client ID' });
    }

    // Check if client is active
    if (!client.is_active) {
      return res.status(401).json({ error: 'Client is inactive' });
    }

    // Create a temporary client session token
    const tempTokenData = await Token.createClientSession(client.id, client.realm_id);
    
    // Get realm info
    const realm = await require('../models/Realm').findById(client.realm_id);

    res.json({
      message: 'Client login successful',
      client: {
        id: client.id,
        name: client.name,
        description: client.description,
        realm_id: client.realm_id,
        realm_name: realm?.name
      },
      access_token: tempTokenData.access_token,
      refresh_token: tempTokenData.refresh_token,
      expires_at: tempTokenData.expires_at,
      is_client_session: true
    });

  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint (2FA-aware)
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // For non-superusers, check if they have a client_id associated
    if (!user.is_super_user && !user.client_id) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a client to login.',
        code: 'CLIENT_REQUIRED'
      });
    }

    // If user is linked to client and 2FA enabled on that client, send OTP and expect validate-otp
    if (!user.is_super_user && user.client_id) {
      const client = await Client.findById(user.client_id);
      if (client?.twofa_enabled) {
        const { code } = await Otp.createOtpForUser(user.id, '2fa', 10);
        console.log(`[2FA OTP] email=${user.email} code=${code}`);
        let emailSent = false;
        try {
          let smtpCfg = client.smtp_config || null;
          if (smtpCfg && typeof smtpCfg === 'string') {
            try { smtpCfg = JSON.parse(smtpCfg); } catch {}
          }
          await EmailService.sendOtpEmail({ to: user.email, code, purpose: '2fa' }, smtpCfg);
          emailSent = true;
        } catch (e1) {
          try {
            await EmailService.sendOtpEmail({ to: user.email, code, purpose: '2fa' }, null);
            emailSent = true;
          } catch (e2) {
            console.error('2FA OTP email failed (client and default SMTP).', e1?.message || e1, e2?.message || e2);
          }
        }
        return res.json({ message: emailSent ? 'OTP sent for 2FA' : 'OTP generated; email sending failed', requires_otp: true, email_sent: emailSent });
      }
    }

    // Revoke any existing tokens for this user
    await Token.revokeAllUserTokens(user.id);

    // Create new tokens
    const tokenData = await Token.create(user.id, user.is_super_user);

    // Return user info (without password) and tokens
    const { password: _, ...userInfo } = user;
    res.json({
      message: 'Login successful',
      user: userInfo,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Refresh token endpoint
router.post('/refresh', [
  body('refresh_token').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { refresh_token } = req.body;

    // Refresh the access token
    const tokenData = await Token.refreshAccessToken(refresh_token);

    res.json({
      message: 'Token refreshed successfully',
      access_token: tokenData.access_token,
      expires_at: tokenData.expires_at
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// Logout endpoint
router.post('/logout', auth, async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      await Token.revokeToken(token);
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('Profile endpoint called, user:', req.user);
    res.json({ user: req.user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test endpoint to verify token works
router.get('/test', auth, async (req, res) => {
  try {
    res.json({ 
      message: 'Token is valid!', 
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate token/user (authenticated)
router.get('/validate', auth, async (req, res) => {
  try {
    res.json({ valid: true, user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate an external request against client endpoints and user role access
// Body: { host, route, method }
router.post('/validate-request', auth, [
  body('host').isString().isLength({ min: 1 }),
  body('route').isString().isLength({ min: 1 }),
  body('method').isString().isIn(['GET','POST','PUT','DELETE','PATCH'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { host, route, method } = req.body;
    const user = req.user;

    // Super users bypass checks
    if (user.is_super_user) {
      return res.json({ allowed: true, reason: 'super_user' });
    }

    // Load full user to access client_id
    const fullUser = await require('../models/User').findById(user.id);
    if (!fullUser || !fullUser.client_id) {
      return res.status(403).json({ allowed: false, error: 'User not associated with client' });
    }

    // Check client endpoints for host
    const client = await Client.findById(fullUser.client_id);
    let endpoints = client?.endpoints;
    if (endpoints && typeof endpoints === 'string') { try { endpoints = JSON.parse(endpoints); } catch {} }
    // endpoints expected structure: { allowed_hosts: ["api.example.com", ...] }
    const allowedHosts = Array.isArray(endpoints?.allowed_hosts) ? endpoints.allowed_hosts : [];
    const hostAllowed = allowedHosts.length === 0 || allowedHosts.includes(host);
    if (!hostAllowed) {
      return res.status(403).json({ allowed: false, error: 'host_not_allowed' });
    }

    // Load roles with access
    const roles = await Role.getUserRolesWithAccess(user.id);
    // If no roles, deny
    if (!roles || roles.length === 0) {
      return res.status(403).json({ allowed: false, error: 'no_roles' });
    }

    // Normalize inputs
    const reqPath = route;
    const reqMethod = method.toUpperCase();

    // Check role access: access: [{ module, rights, uri:[{url, methods:[]}, ...] }]
    const methodMatches = (methods) => methods.includes(reqMethod);
    const urlMatches = (pattern, path) => {
      // Simple wildcard match for trailing *
      if (pattern.endsWith('*')) {
        const base = pattern.slice(0, -1);
        return path.startsWith(base);
      }
      return pattern === path;
    };

    let allowed = false;
    let matchedRoleId = null;
    outer: for (const role of roles) {
      let access = role.access;
      if (typeof access === 'string') { try { access = JSON.parse(access); } catch { continue; } }
      if (!Array.isArray(access)) continue;
      for (const mod of access) {
        if (!Array.isArray(mod.uri)) continue;
        for (const entry of mod.uri) {
          if (!entry.url || !Array.isArray(entry.methods)) continue;
          if (urlMatches(entry.url, reqPath) && methodMatches(entry.methods)) {
            allowed = true;
            matchedRoleId = role.id;
            break outer;
          }
        }
      }
    }

    return res.json({ allowed, matched_role_id: matchedRoleId });
  } catch (error) {
    console.error('validate-request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password - send OTP to email
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findByEmail(email);
    if (!user) {
      // Avoid user enumeration
      return res.json({ message: 'If the email exists, an OTP has been sent' });
    }

    const { code } = await Otp.createOtpForUser(user.id, 'reset', 10);
    console.log(`[RESET OTP] email=${user.email} code=${code}`);

    // Determine SMTP: client SMTP if present, else default
    let smtp = null;
    if (!user.is_super_user && user.client_id) {
      const client = await Client.findById(user.client_id);
      let cfg = client?.smtp_config;
      if (cfg && typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch {} }
      if (cfg && Object.keys(cfg).length > 0) smtp = cfg;
    }
    let emailSent = false;
    try {
      await EmailService.sendOtpEmail({ to: user.email, code, purpose: 'reset' }, smtp);
      emailSent = true;
    } catch (e1) {
      try {
        await EmailService.sendOtpEmail({ to: user.email, code, purpose: 'reset' }, null);
        emailSent = true;
      } catch (e2) {
        console.error('Reset OTP email failed (client and default SMTP).', e1?.message || e1, e2?.message || e2);
      }
    }

    res.json({ message: 'If the email exists, an OTP has been sent', email_sent: emailSent });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend OTP for 2FA or password reset
router.post('/resend-otp', [
  body('email').isEmail().normalizeEmail(),
  body('purpose').isIn(['2fa', 'reset'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, purpose } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.json({ message: 'OTP sent' });

    const { code } = await Otp.createOtpForUser(user.id, purpose, 10);
    console.log(`[RESEND OTP] purpose=${purpose} email=${user.email} code=${code}`);

    let smtp = null;
    if (!user.is_super_user && user.client_id) {
      const client = await Client.findById(user.client_id);
      let cfg = client?.smtp_config;
      if (cfg && typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch {} }
      if (cfg && Object.keys(cfg).length > 0) smtp = cfg;
    }
    let emailSent = false;
    try {
      await EmailService.sendOtpEmail({ to: user.email, code, purpose }, smtp);
      emailSent = true;
    } catch (e1) {
      try {
        await EmailService.sendOtpEmail({ to: user.email, code, purpose }, null);
        emailSent = true;
      } catch (e2) {
        console.error('Resend OTP email failed (client and default SMTP).', e1?.message || e1, e2?.message || e2);
      }
    }

    res.json({ message: 'OTP sent', email_sent: emailSent });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate OTP (2FA) -> return tokens
router.post('/validate-otp', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 4 }),
  body('purpose').isIn(['2fa'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid code' });

    const result = await Otp.verifyAndConsume(user.id, '2fa', code);
    if (!result.valid) return res.status(401).json({ error: 'Invalid or expired code' });

    await Token.revokeAllUserTokens(user.id);
    const tokenData = await Token.create(user.id, user.is_super_user);
    const { password: _, ...userInfo } = user;
    res.json({
      message: '2FA verified',
      user: userInfo,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at
    });
  } catch (error) {
    console.error('Validate OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password using OTP
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 4 }),
  body('new_password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code, new_password } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(400).json({ error: 'Invalid request' });

    const result = await Otp.verifyAndConsume(user.id, 'reset', code);
    if (!result.valid) return res.status(401).json({ error: 'Invalid or expired code' });

    await User.updatePassword(user.id, new_password);
    await Token.revokeAllUserTokens(user.id);

    res.json({ message: 'Password reset successful. Please login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.put('/change-password', auth, [
  body('currentPassword').isLength({ min: 1 }),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get full user data for password verification
    const user = await User.findById(req.user.id);
    
    // Verify current password
    const isValidPassword = await User.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await User.updatePassword(req.user.id, newPassword);
    
    // Revoke all existing tokens for security
    await Token.revokeAllUserTokens(req.user.id);
    
    res.json({ message: 'Password updated successfully. Please login again.' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (super user only)
router.get('/users', auth, requireSuperUser, async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's active tokens (super user only)
router.get('/tokens', auth, requireSuperUser, async (req, res) => {
  try {
    const tokens = await Token.getActiveTokens(req.user.id);
    res.json({ tokens });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
