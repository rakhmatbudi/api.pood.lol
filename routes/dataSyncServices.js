const express = require('express');
const router = express.Router();
const DataSyncService = require('../services/DataSyncService'); // Import the service

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
        // res.status(500).json({ error: 'An error occurred during data synchronization.', details: error.message }); //send details
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

module.exports = router;
