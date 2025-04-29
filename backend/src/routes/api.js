// routes/api.js
const express = require('express');
const router = express.Router();
const BusLocation = require('../models/BusLocation');

// POST /api/trips - Save trip details
router.post('/trips', async (req, res) => {
  try {
    const { driverId, from, to, startTime, busDetails } = req.body;

    // Validate required fields
    if (!driverId || !from || !to || !busDetails) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const trip = new BusLocation({
      driverId,
      busDetails,
      type: 'trip',
      from,
      to,
      startTime,
    });

    await trip.save();
    res.json({ success: true, tripId: trip._id });
  } catch (error) {
    console.error('Error saving trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/driver-locations - Save driver location
router.post('/driver-locations', async (req, res) => {
  try {
    const { driverId, busDetails, latitude, longitude } = req.body;

    // Validate required fields
    if (!driverId || !busDetails || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Delete previous location for this driver to keep only the latest
    await BusLocation.deleteMany({ driverId, type: 'location' });

    const location = new BusLocation({
      driverId,
      busDetails,
      type: 'location',
      latitude,
      longitude,
    });

    await location.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/driver-locations/:busDetails - Fetch latest driver location
router.get('/driver-locations/:busDetails', async (req, res) => {
  try {
    const busDetails = req.params.busDetails;
    const location = await BusLocation.findOne({ busDetails, type: 'location' })
      .sort({ timestamp: -1 }); // Get the latest location

    if (location) {
      res.json({
        driverId: location.driverId,
        busDetails: location.busDetails,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
      });
    } else {
      res.status(404).json({ message: 'No location found' });
    }
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;