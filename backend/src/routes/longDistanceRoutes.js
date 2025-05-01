const express = require('express');
const router = express.Router();
const LongDistanceRoute = require('../models/LongDistanceRoute');

// Get routes by from and to locations
router.get('/route/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;

    // Normalize inputs: trim whitespace and convert to case-insensitive regex
    const fromRegex = new RegExp(`^${from.trim()}$`, 'i');
    const toRegex = new RegExp(`^${to.trim()}$`, 'i');

    console.log(`Searching for routes from: ${from}, to: ${to}`); // Debug log

    // Query the database
    const routes = await LongDistanceRoute.find({
      from: fromRegex,
      to: toRegex,
    });

    // Log the results for debugging
    console.log(`Found ${routes.length} routes:`, routes);

    if (routes.length === 0) {
      return res.status(404).json({ message: `No routes found from ${from} to ${to}` });
    }

    res.json(routes);
  } catch (error) {
    console.error('Error fetching routes:', error); // Log error for debugging
    res.status(500).json({ message: 'Server error while fetching routes' });
  }
});

module.exports = router;