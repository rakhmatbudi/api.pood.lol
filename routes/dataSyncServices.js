// routes/dataSyncServices.js

const express = require('express');
const router = express.Router();
const DataSyncService = require('../services/DataSyncService'); // Import the service

// *** IMPORTANT: If you no longer need direct CRUD operations via these routes
// If these are purely for triggering sync, you can remove the Promo model imports.
// However, if you still want API endpoints for direct management alongside sync,
// you would need to keep the Promo model import and define different routes for them.
// For now, I'll assume POST /promos and POST /promo_items are *solely* for sync.

// const Promo = require('../models/Promo'); // Remove if not doing direct CRUD
// const MenuItem = require('../models/MenuItem'); // Remove if not doing direct CRUD

// --- Synchronization Endpoints (POST requests) ---

// Route for triggering the full data synchronization
router.post('/', async (req, res, next) => {
    try {
        console.log('API Call: POST /data-sync/ (Full Sync)');
        await DataSyncService.fullSync();
        res.status(200).json({ message: 'Full data synchronization completed successfully.' });
    } catch (error) {
        console.error("Error in /sync route:", error);
        next(error);
    }
});

// Route for triggering only menu categories synchronization
router.post('/categories', async (req, res, next) => {
    try {
        console.log('API Call: POST /data-sync/categories (Sync Categories)');
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
        console.log('API Call: POST /data-sync/items (Sync Items)');
        await DataSyncService.syncMenuItems();
        res.status(200).json({ message: 'Menu items synchronized successfully.' });
    } catch (error) {
        console.error("Error in /sync/items route", error);
        next(error);
    }
});

// Route for triggering only menu item variants synchronization
router.post('/variants', async (req, res, next) => {
    try {
        console.log('API Call: POST /data-sync/variants (Sync Variants)');
        await DataSyncService.syncItemVariants();
        res.status(200).json({ message: 'Menu item variants synchronized successfully.' });
    } catch (error) {
        console.error("Error in /sync/variants route", error);
        next(error);
    }
});

// --- CORRECTED: Route for migrating promos table ---
router.post('/promos', async (req, res, next) => {
    try {
        console.log('API Call: POST /data-sync/promos (Migrate Promos Table)');
        await DataSyncService.syncPromos(); // <--- Now calls the sync service!
        res.status(200).json({ message: 'Promos table synchronized successfully.' });
    } catch (error) {
        console.error("Error in /sync/promos route (migration):", error);
        next(error);
    }
});

// --- CORRECTED: Route for migrating promo_items table ---
router.post('/promo_items', async (req, res, next) => {
    try {
        console.log('API Call: POST /data-sync/promo_items (Migrate Promo Items Table)');
        await DataSyncService.syncPromoItems(); // <--- Now calls the sync service!
        res.status(200).json({ message: 'Promo items table synchronized successfully.' });
    } catch (error) {
        console.error("Error in /sync/promo_items route (migration):", error);
        next(error);
    }
});


// --- OLD PROMO MANAGEMENT ENDPOINTS (CONSIDER REMOVING or MOVING) ---
// If you want to keep these for direct CRUD, you must change their paths
// to avoid conflicts with the sync endpoints. For example:
// router.get('/manage/promos', ... ) or create a separate /promos router.
// For now, I'm assuming you primarily want the sync functionality on these paths.

/*
// Get all promos - This conflicts with POST /promos if you want /promos to be a sync route
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

// Get a promo by ID - This conflicts with POST /promos if you want /promos to be a sync route
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

// Create a new promo - THIS IS THE ORIGINAL CONFLICTING ROUTE
// router.post('/promos', async (req, res, next) => { ... }); // Replaced by sync route

// Update an existing promo - Conflicts if you want /promos/:id to be a sync route
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

// Delete a promo - Conflicts if you want /promos/:id to be a sync route
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
*/

module.exports = router;