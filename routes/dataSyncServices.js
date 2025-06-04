// routes/dataSyncServices.js

const express = require('express');
const router = express.Router();
const DataSyncService = require('../services/DataSyncService'); // Import the service
const Promo = require('../models/Promo'); // Import the Promo model for direct use
const MenuItem = require('../models/MenuItem'); // Assuming you have a MenuItem model, if needed for validation/lookup

// Route for triggering the full data synchronization
router.post('/', async (req, res, next) => {
    try {
        // Call the fullSync method of the DataSyncService
        await DataSyncService.fullSync();
        res.status(200).json({ message: 'Data synchronization completed successfully.' });
    } catch (error) {
        // Handle any errors that occur during the synchronization process
        console.error("Error in /sync route:", error);
        next(error); // Pass the error to the error-handling middleware
    }
});

// Route for triggering only menu categories synchronization
router.post('/categories', async (req, res, next) => {
    try {
        await DataSyncService.syncItemCategories();
        res.status(200).json({ message: 'Menu categories synchronized successfully.' });
    } catch (error) {
        console.error("Error in /sync/categories route", error);
        next(error);
    }
});

// Route for triggering only menu items synchronization
router.post('/items', async (req, res, next) => {
    try {
        await DataSyncService.syncMenuItems();
        res.status(200).json({ message: 'Menu items synchronized successfully.' });
    } catch (error) {
        console.error("Error in /sync/items route", error);
        next(error);
    }
});

// New route for triggering only menu item variants synchronization
router.post('/variants', async (req, res, next) => {
    try {
        await DataSyncService.syncItemVariants();
        res.status(200).json({ message: 'Menu item variants synchronized successfully.' });
    } catch (error) {
        console.error("Error in /sync/variants route", error);
        next(error);
    }
});

// --- NEW PROMO MANAGEMENT ENDPOINTS (DIRECTLY IN ROUTE) ---

// Get all promos
router.get('/promos', async (req, res, next) => {
    try {
        const promos = await Promo.findAll();
        res.status(200).json({
            status: 'success',
            data: promos
        });
    } catch (error) {
        console.error('Error fetching all promos:', error);
        next(error);
    }
});

// Get a promo by ID
router.get('/promos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const promo = await Promo.findById(id);
        if (!promo) {
            return res.status(404).json({
                status: 'error',
                message: 'Promo not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: promo
        });
    } catch (error) {
        console.error(`Error fetching promo ${req.params.id}:`, error);
        next(error);
    }
});

// Create a new promo
router.post('/promos', async (req, res, next) => {
    try {
        const newPromo = await Promo.create(req.body);
        res.status(201).json({
            status: 'success',
            message: 'Promo created successfully',
            data: newPromo
        });
    } catch (error) {
        console.error('Error creating promo:', error);
        next(error);
    }
});

// Update an existing promo
router.put('/promos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const updatedPromo = await Promo.update(id, req.body);
        if (!updatedPromo) {
            return res.status(404).json({
                status: 'error',
                message: 'Promo not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Promo updated successfully',
            data: updatedPromo
        });
    } catch (error) {
        console.error(`Error updating promo ${req.params.id}:`, error);
        next(error);
    }
});

// Delete a promo
router.delete('/promos/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const deletedPromo = await Promo.delete(id);
        if (!deletedPromo) {
            return res.status(404).json({
                status: 'error',
                message: 'Promo not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Promo deleted successfully',
            data: deletedPromo
        });
    } catch (error) {
        console.error(`Error deleting promo ${req.params.id}:`, error);
        next(error);
    }
});

module.exports = router;