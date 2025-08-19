const express = require('express');
const { body, validationResult } = require('express-validator');
const Realm = require('../models/Realm');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Validation middleware
const validateRealm = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Realm name is required and must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Realm name can only contain letters, numbers, underscores, and hyphens'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean value')
];

// Get all realms (with statistics)
router.get('/', auth, async (req, res) => {
    try {
        const realms = await Realm.findAllWithStats();
        res.json({
            success: true,
            data: realms
        });
    } catch (error) {
        console.error('Error fetching realms:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch realms'
        });
    }
});

// Get realm by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const realm = await Realm.findById(id);
        
        if (!realm) {
            return res.status(404).json({
                success: false,
                error: 'Realm not found'
            });
        }
        
        // Get realm statistics
        const stats = await Realm.getStats(id);
        
        res.json({
            success: true,
            data: { ...realm, stats }
        });
    } catch (error) {
        console.error('Error fetching realm:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch realm'
        });
    }
});

// Create new realm
router.post('/', auth, validateRealm, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        
        const { name, description, is_active = true } = req.body;
        
        // Check if realm name already exists
        const existingRealm = await Realm.findByName(name);
        if (existingRealm) {
            return res.status(409).json({
                success: false,
                error: 'Realm name already exists'
            });
        }
        
        // Create the realm
        const realm = await Realm.create(name, description, is_active);
        
        res.status(201).json({
            success: true,
            message: 'Realm created successfully',
            data: realm
        });
    } catch (error) {
        console.error('Error creating realm:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create realm'
        });
    }
});

// Update realm
router.put('/:id', auth, validateRealm, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        
        const { id } = req.params;
        const { name, description, is_active } = req.body;
        
        // Check if realm exists
        const existingRealm = await Realm.findById(id);
        if (!existingRealm) {
            return res.status(404).json({
                success: false,
                error: 'Realm not found'
            });
        }
        
        // If name is being changed, check for duplicates
        if (name && name !== existingRealm.name) {
            const duplicateRealm = await Realm.findByName(name);
            if (duplicateRealm) {
                return res.status(409).json({
                    success: false,
                    error: 'Realm name already exists'
                });
            }
        }
        
        // Build updates object
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (is_active !== undefined) updates.is_active = is_active;
        
        // Update the realm
        const updatedRealm = await Realm.update(id, updates);
        
        res.json({
            success: true,
            message: 'Realm updated successfully',
            data: updatedRealm
        });
    } catch (error) {
        console.error('Error updating realm:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update realm'
        });
    }
});

// Delete realm
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if realm exists
        const existingRealm = await Realm.findById(id);
        if (!existingRealm) {
            return res.status(404).json({
                success: false,
                error: 'Realm not found'
            });
        }
        
        // Delete the realm
        await Realm.delete(id);
        
        res.json({
            success: true,
            message: 'Realm deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting realm:', error);
        
        // Handle specific error for realm with dependencies
        if (error.message.includes('Cannot delete realm with existing clients or users')) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete realm with existing clients or users. Please remove all dependencies first.'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to delete realm'
        });
    }
});

// Toggle realm status
router.patch('/:id/toggle-status', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if realm exists
        const existingRealm = await Realm.findById(id);
        if (!existingRealm) {
            return res.status(404).json({
                success: false,
                error: 'Realm not found'
            });
        }
        
        // Toggle the status
        const updatedRealm = await Realm.toggleStatus(id);
        
        res.json({
            success: true,
            message: `Realm ${updatedRealm.is_active ? 'activated' : 'deactivated'} successfully`,
            data: updatedRealm
        });
    } catch (error) {
        console.error('Error toggling realm status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle realm status'
        });
    }
});

module.exports = router;
