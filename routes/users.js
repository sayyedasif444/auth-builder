const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Realm = require('../models/Realm');
const Client = require('../models/Client');
const Role = require('../models/Role'); // Added Role import
const { auth } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Get all users with filters
router.get('/', auth, async (req, res) => {
  try {
    const filters = {
      realm_id: req.query.realm_id || null,
      client_id: req.query.client_id || null,
      is_super_user: req.query.is_super_user !== undefined ? req.query.is_super_user === 'true' : undefined,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      search: req.query.search || null
    };

    const users = await User.findAll(filters);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', auth, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required and must be less than 100 characters'),
  body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required and must be less than 100 characters'),
  body('is_super_user').isBoolean().withMessage('is_super_user must be a boolean'),
  body('realm_id').optional().isInt().withMessage('realm_id must be a valid integer'),
  body('client_id').optional().isInt().withMessage('client_id must be a valid integer'),
  body('roles').optional().isArray().withMessage('roles must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, is_super_user, realm_id, client_id, roles } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // If realm_id is provided, verify realm exists
    if (realm_id) {
      const realm = await Realm.findById(realm_id);
      if (!realm) {
        return res.status(400).json({ error: 'Realm not found' });
      }
    }

    // If client_id is provided, verify client exists
    let client = null;
    if (client_id) {
      client = await Client.findById(client_id);
      if (!client) {
        return res.status(400).json({ error: 'Client not found' });
      }
    }

    // Create user
    const user = await User.create({
      email,
      password,
      first_name,
      last_name,
      is_super_user,
      realm_id,
      client_id
    });

    // Assign roles if provided
    if (roles && Array.isArray(roles) && roles.length > 0) {
      try {
        for (const roleId of roles) {
          await Role.assignRoleToUser(user.id, roleId);
        }
        console.log(`Assigned ${roles.length} roles to user ${user.email}`);
      } catch (roleError) {
        console.error('Failed to assign roles:', roleError);
        // Don't fail the user creation if role assignment fails
      }
    }

    // Send welcome email for non-super users
    if (!is_super_user && user.generatedPassword) {
      try {
        let smtpConfig = null;
        
        // Use client SMTP if available, otherwise use system default
        if (client && client.smtp_config && Object.keys(client.smtp_config).length > 0) {
          smtpConfig = client.smtp_config;
        }
        
        await emailService.sendWelcomeEmail(user, smtpConfig);
        console.log(`Welcome email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the user creation if email fails
        // The generated password is still returned in the response
      }
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', auth, [
  body('first_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('First name must be less than 100 characters'),
  body('last_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be less than 100 characters'),
  body('is_super_user').optional().isBoolean().withMessage('is_super_user must be a boolean'),
  body('realm_id').optional().isInt().withMessage('realm_id must be a valid integer'),
  body('client_id').optional().isInt().withMessage('client_id must be a valid integer'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('roles').optional().isArray().withMessage('roles must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const updateData = { ...req.body };
    const { roles, password, ...userUpdateData } = updateData;

    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent modifying admin user's super user status
    if (existingUser.email === 'admin@admin.com' && userUpdateData.is_super_user === false) {
      return res.status(400).json({ error: 'Cannot remove super user status from admin user' });
    }

    // If realm_id is provided, verify realm exists
    if (userUpdateData.realm_id) {
      const realm = await Realm.findById(userUpdateData.realm_id);
      if (!realm) {
        return res.status(400).json({ error: 'Realm not found' });
      }
    }

    // If client_id is provided, verify client exists
    if (userUpdateData.client_id) {
      const client = await Client.findById(userUpdateData.client_id);
      if (!client) {
        return res.status(400).json({ error: 'Client not found' });
      }
    }

    // If password is provided, update it securely (hash inside model)
    if (password) {
      await User.updatePassword(userId, password);
    }

    // Update other fields if any; if none, skip to fetch
    let updatedUser = null;
    const hasOtherFields = Object.keys(userUpdateData).length > 0;
    if (hasOtherFields) {
      updatedUser = await User.update(userId, userUpdateData);
    } else {
      updatedUser = await User.findById(userId);
    }

    // Handle role assignments if provided
    if (roles !== undefined) {
      try {
        // Remove all existing role assignments
        const existingRoles = await Role.getUserRoles(userId);
        for (const role of existingRoles) {
          await Role.removeRoleFromUser(userId, role.id);
        }

        // Assign new roles if provided
        if (Array.isArray(roles) && roles.length > 0) {
          for (const roleId of roles) {
            await Role.assignRoleToUser(userId, roleId);
          }
        }
        console.log(`Updated roles for user ${updatedUser.email}`);
      } catch (roleError) {
        console.error('Failed to update user roles:', roleError);
        // Don't fail the user update if role assignment fails
      }
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    const deletedUser = await User.delete(userId);
    res.json({ message: 'User deleted successfully', user: deletedUser });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error.message === 'Cannot delete admin user') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Toggle user status
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle status
    const updatedUser = await User.toggleStatus(userId);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error toggling user status:', error);
    if (error.message === 'Cannot deactivate admin user') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// Get user statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const filters = {
      realm_id: req.query.realm_id || null,
      client_id: req.query.client_id || null
    };

    const stats = await User.getStats(filters);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

module.exports = router;
