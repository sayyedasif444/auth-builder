const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Client = require('../models/Client');
const Realm = require('../models/Realm');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all clients (optionally filtered by realm)
router.get('/', auth, async (req, res) => {
  try {
    const { realm_id } = req.query;
    const clients = await Client.findAll(realm_id ? parseInt(realm_id) : null);
    
    res.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clients'
    });
  }
});

// Get client by ID
router.get('/:id', auth, [
  param('id').isInt().withMessage('Invalid client ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const client = await Client.findById(parseInt(req.params.id));
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client'
    });
  }
});

// Create new client
router.post('/', auth, [
  body('realm_id').isInt().withMessage('Realm ID is required and must be an integer'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Client name is required and must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('endpoints').optional().isObject().withMessage('Endpoints must be a valid object'),
  body('redirect_urls').optional().isArray().withMessage('Redirect URLs must be an array'),
  body('redirect_urls.*').optional().custom((value) => {
    if (!value || value.trim() === '') return true; // Allow empty URLs
    // More flexible URL validation for development
    try {
      const url = new URL(value);
      // Allow localhost, 127.0.0.1, and valid domains
      const hostname = url.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.')) {
        return true;
      }
      throw new Error('Invalid hostname');
    } catch (error) {
      throw new Error('Invalid redirect URL format');
    }
  }).withMessage('Invalid redirect URL format'),
  body('sso_enabled').optional().isBoolean().withMessage('SSO enabled must be a boolean'),
  body('twofa_enabled').optional().isBoolean().withMessage('2FA enabled must be a boolean'),
  body('smtp_config').optional().isObject().withMessage('SMTP config must be a valid object')
], async (req, res) => {
  try {
    console.log('Client creation request received:', {
      body: req.body,
      headers: req.headers
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { realm_id, ...clientData } = req.body;
    console.log('Extracted data:', { realm_id, clientData });

    // Check if realm exists
    const realm = await Realm.findById(realm_id);
    if (!realm) {
      console.log('Realm not found:', realm_id);
      return res.status(404).json({
        success: false,
        error: 'Realm not found'
      });
    }

    // Check if client name already exists in this realm
    const existingClient = await Client.findByNameInRealm(realm_id, clientData.name);
    if (existingClient) {
      console.log('Client name already exists in realm:', { realm_id, name: clientData.name });
      return res.status(400).json({
        success: false,
        error: 'Client name already exists in this realm'
      });
    }

    // Validate SMTP config if 2FA is enabled
    if (clientData.twofa_enabled && clientData.smtp_config) {
      const requiredSmtpFields = ['host', 'port', 'username', 'password', 'from_email'];
      const missingFields = requiredSmtpFields.filter(field => !clientData.smtp_config[field]);
      
      if (missingFields.length > 0) {
        console.log('SMTP configuration incomplete:', missingFields);
        return res.status(400).json({
          success: false,
          error: `SMTP configuration is incomplete. Missing: ${missingFields.join(', ')}`
        });
      }
    }

    console.log('Creating client with data:', { realm_id, clientData });
    const client = await Client.create(realm_id, clientData);
    
    console.log('Client created successfully:', client.id);
    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create client'
    });
  }
});

// Update client
router.put('/:id', auth, [
  param('id').isInt().withMessage('Invalid client ID'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Client name is required and must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('endpoints').optional().isObject().withMessage('Endpoints must be a valid object'),
  body('redirect_urls').optional().isArray().withMessage('Redirect URLs must be an array'),
  body('redirect_urls.*').optional().custom((value) => {
    if (!value || value.trim() === '') return true; // Allow empty URLs
    // More flexible URL validation for development
    try {
      const url = new URL(value);
      // Allow localhost, 127.0.0.1, and valid domains
      const hostname = url.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.')) {
        return true;
      }
      throw new Error('Invalid hostname');
    } catch (error) {
      throw new Error('Invalid redirect URL format');
    }
  }).withMessage('Invalid redirect URL format'),
  body('sso_enabled').optional().isBoolean().withMessage('SSO enabled must be a boolean'),
  body('twofa_enabled').optional().isBoolean().withMessage('2FA enabled must be a boolean'),
  body('smtp_config').optional().isObject().withMessage('SMTP config must be a valid object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const clientId = parseInt(req.params.id);
    const updateData = req.body;

    // Check if client exists
    const existingClient = await Client.findById(clientId);
    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Check if name change conflicts with existing client in same realm
    if (updateData.name && updateData.name !== existingClient.name) {
      const nameConflict = await Client.findByNameInRealm(existingClient.realm_id, updateData.name);
      if (nameConflict) {
        return res.status(400).json({
          success: false,
          error: 'Client name already exists in this realm'
        });
      }
    }

    // Validate SMTP config if 2FA is enabled
    if (updateData.twofa_enabled && updateData.smtp_config) {
      const requiredSmtpFields = ['host', 'port', 'username', 'password', 'from_email'];
      const missingFields = requiredSmtpFields.filter(field => !updateData.smtp_config[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `SMTP configuration is incomplete. Missing: ${missingFields.join(', ')}`
        });
      }
    }

    const updatedClient = await Client.update(clientId, updateData);
    
    res.json({
      success: true,
      message: 'Client updated successfully',
      data: updatedClient
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client'
    });
  }
});

// Delete client
router.delete('/:id', auth, [
  param('id').isInt().withMessage('Invalid client ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const clientId = parseInt(req.params.id);
    
    // Check if client exists
    const existingClient = await Client.findById(clientId);
    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    await Client.delete(clientId);
    
    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete client'
    });
  }
});

// Toggle client status
router.patch('/:id/toggle-status', auth, [
  param('id').isInt().withMessage('Invalid client ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const clientId = parseInt(req.params.id);
    
    // Check if client exists
    const existingClient = await Client.findById(clientId);
    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const updatedClient = await Client.toggleStatus(clientId);
    
    res.json({
      success: true,
      message: `Client ${updatedClient.is_active ? 'activated' : 'deactivated'} successfully`,
      data: updatedClient
    });
  } catch (error) {
    console.error('Error toggling client status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle client status'
    });
  }
});

// Regenerate client secret
router.post('/:id/regenerate-secret', auth, [
  param('id').isInt().withMessage('Invalid client ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const clientId = parseInt(req.params.id);
    
    // Check if client exists
    const existingClient = await Client.findById(clientId);
    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const updatedClient = await Client.regenerateSecret(clientId);
    
    res.json({
      success: true,
      message: 'Client secret regenerated successfully',
      data: updatedClient
    });
  } catch (error) {
    console.error('Error regenerating client secret:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate client secret'
    });
  }
});

// Get client statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { realm_id } = req.query;
    const stats = await Client.getStats(realm_id ? parseInt(realm_id) : null);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client statistics'
    });
  }
});

module.exports = router;
