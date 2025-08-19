const express = require('express');
const { body, validationResult } = require('express-validator');
const Role = require('../models/Role');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all roles with filters (realm-specific)
router.get('/', auth, async (req, res) => {
  try {
    const filters = {
      name: req.query.name || null,
      realm_id: req.query.realm_id || null,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined
    };

    const roles = await Role.findAll(filters);
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get role by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// Create new role (realm-specific)
router.post('/', auth, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Role name is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('realm_id').isInt({ min: 1 }).withMessage('Realm ID is required and must be a positive integer'),
  body('access').isArray().withMessage('Access must be an array'),
  body('access.*.module').trim().isLength({ min: 1 }).withMessage('Module name is required'),
  body('access.*.rights').isIn(['READ', 'WRITE', 'ALL']).withMessage('Rights must be READ, WRITE, or ALL'),
  body('access.*.uri').isArray().withMessage('URI must be an array'),
  body('access.*.uri.*.url').trim().isLength({ min: 1 }).withMessage('URL is required'),
  body('access.*.uri.*.methods').isArray().withMessage('Methods must be an array'),
  body('access.*.uri.*.methods.*').isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).withMessage('Invalid HTTP method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, access, realm_id } = req.body;

    // Debug logging
    console.log('Creating role with data:', {
      name,
      description,
      realm_id,
      realm_id_type: typeof realm_id,
      access,
      access_type: typeof access,
      access_stringified: JSON.stringify(access)
    });

    // Check if role already exists in the same realm
    const existingRole = await Role.findByName(name, realm_id);
    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists in the specified realm' });
    }

    // Validate access structure
    try {
      Role.validateAccess(access);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    // Additional JSON validation
    try {
      // Test if the access data can be properly stringified and parsed
      const accessString = JSON.stringify(access);
      const parsedAccess = JSON.parse(accessString);
      console.log('Access validation - Original:', access);
      console.log('Access validation - Stringified:', accessString);
      console.log('Access validation - Parsed:', parsedAccess);
    } catch (jsonError) {
      console.error('JSON validation error:', jsonError);
      return res.status(400).json({ error: 'Invalid access data format' });
    }

    // Convert realm_id to number if it's a string
    const numericRealmId = parseInt(realm_id, 10);
    if (isNaN(numericRealmId)) {
      return res.status(400).json({ error: 'Invalid realm ID format' });
    }

    const role = await Role.create({ name, description, access, realm_id: numericRealmId });
    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update role
router.put('/:id', auth, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Role name is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('access').isArray().withMessage('Access must be an array'),
  body('access.*.module').trim().isLength({ min: 1 }).withMessage('Module name is required'),
  body('access.*.rights').isIn(['READ', 'WRITE', 'ALL']).withMessage('Rights must be READ, WRITE, or ALL'),
  body('access.*.uri').isArray().withMessage('URI must be an array'),
  body('access.*.uri.*.url').trim().isLength({ min: 1 }).withMessage('URL is required'),
  body('access.*.uri.*.methods').isArray().withMessage('Methods must be an array'),
  body('access.*.uri.*.methods.*').isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).withMessage('Invalid HTTP method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, access } = req.body;
    const roleId = req.params.id;

    // Check if role exists
    const existingRole = await Role.findById(roleId);
    if (!existingRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if name is being changed and if it conflicts with another role in the same realm
    if (name !== existingRole.name) {
      const roleWithSameName = await Role.findByName(name, existingRole.realm_id);
      if (roleWithSameName && roleWithSameName.id !== parseInt(roleId)) {
        return res.status(400).json({ error: 'Role with this name already exists in the same realm' });
      }
    }

    // Validate access structure
    try {
      Role.validateAccess(access);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    const role = await Role.update(roleId, { name, description, access });
    res.json(role);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete role
router.delete('/:id', auth, async (req, res) => {
  try {
    const roleId = req.params.id;

    // Check if role exists
    const existingRole = await Role.findById(roleId);
    if (!existingRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = await Role.delete(roleId);
    res.json({ message: 'Role deleted successfully', role });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Toggle role status
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    const roleId = req.params.id;

    // Check if role exists
    const existingRole = await Role.findById(roleId);
    if (!existingRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = await Role.toggleStatus(roleId);
    res.json(role);
  } catch (error) {
    console.error('Error toggling role status:', error);
    res.status(500).json({ error: 'Failed to toggle role status' });
  }
});

// Get role statistics (realm-specific)
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const filters = {
      name: req.query.name || null,
      realm_id: req.query.realm_id || null
    };

    const stats = await Role.getStats(filters);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching role stats:', error);
    res.status(500).json({ error: 'Failed to fetch role statistics' });
  }
});

// User-Role management routes
router.post('/:id/assign-user', auth, [
  body('user_id').isInt({ min: 1 }).withMessage('User ID is required and must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id } = req.body;
    const roleId = req.params.id;

    const result = await Role.assignRoleToUser(user_id, roleId);
    res.json({ message: 'Role assigned to user successfully', result });
  } catch (error) {
    console.error('Error assigning role to user:', error);
    res.status(500).json({ error: 'Failed to assign role to user' });
  }
});

router.delete('/:id/remove-user/:userId', auth, async (req, res) => {
  try {
    const { id: roleId, userId } = req.params;

    const result = await Role.removeRoleFromUser(userId, roleId);
    res.json({ message: 'Role removed from user successfully', result });
  } catch (error) {
    console.error('Error removing role from user:', error);
    res.status(500).json({ error: 'Failed to remove role from user' });
  }
});

// Get users assigned to a role
router.get('/:id/users', auth, async (req, res) => {
  try {
    const roleId = req.params.id;

    // Check if role exists
    const existingRole = await Role.findById(roleId);
    if (!existingRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const users = await Role.getRoleUsers(roleId);
    res.json(users);
  } catch (error) {
    console.error('Error fetching role users:', error);
    res.status(500).json({ error: 'Failed to fetch role users' });
  }
});

module.exports = router;
