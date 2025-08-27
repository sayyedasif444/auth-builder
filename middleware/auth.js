const Token = require('../models/Token');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Find token in database
    const tokenData = await Token.findByAccessToken(token);
    
    if (!tokenData) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    // Check if token is expired
    if (new Date() > tokenData.expires_at) {
      return res.status(401).json({ error: 'Token expired.' });
    }

    // Extend token expiry on each API call
    await Token.extendExpiry(token);

    // Handle different token types
    if (tokenData.is_client_session) {
      // Client session token
      req.client = {
        id: tokenData.client_id,
        realm_id: tokenData.realm_id
      };
      req.token = tokenData;
      req.isClientSession = true;
    } else {
      // User token
      req.user = {
        id: tokenData.user_id,
        email: tokenData.email,
        is_super_user: tokenData.is_super_user
      };
      req.token = tokenData;
      req.isClientSession = false;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const requireSuperUser = async (req, res, next) => {
  try {
    if (req.isClientSession) {
      return res.status(403).json({ error: 'Access denied. User authentication required.' });
    }
    
    if (!req.user.is_super_user) {
      return res.status(403).json({ error: 'Access denied. Super user privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

const requireUserAuth = async (req, res, next) => {
  try {
    if (req.isClientSession) {
      return res.status(403).json({ error: 'Access denied. User authentication required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { auth, requireSuperUser, requireUserAuth };
