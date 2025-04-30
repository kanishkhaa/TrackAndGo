const express = require('express');
const router = express.Router();
const BusLocation = require('../models/BusLocation'); // Assuming BusLocation model is in models/BusLocation.js
const BusRoute = require('../models/BusRoute'); // Assuming BusRoute model for route data

// POST /api/driver-locations
router.post('/driver-locations', async (req, res) => {
  try {
    const { driverId, busDetails, latitude, longitude } = req.body;
    if (!driverId || !busDetails || !latitude || !longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const normalizedBusDetails = `BUS_${busDetails.trim().toUpperCase()}`; // e.g., "BUS_1A"
    console.log(`Saving location for busDetails: ${normalizedBusDetails}`);
    const location = new BusLocation({
      driverId,
      busDetails: normalizedBusDetails,
      type: 'location', // Explicitly set type
      latitude,
      longitude,
      timestamp: new Date(),
    });
    await location.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving driver location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/driver-locations/:busDetails
router.get('/driver-locations/:busDetails', async (req, res) => {
  try {
    // Normalize busDetails by ensuring a single BUS_ prefix
    let busDetails = req.params.busDetails.trim().toUpperCase();
    // Remove multiple BUS_ prefixes and add a single BUS_
    busDetails = busDetails.replace(/^BUS_+/i, '');
    busDetails = `BUS_${busDetails}`;
    
    console.log(`Querying for busDetails: ${busDetails}`);
    const location = await BusLocation.findOne(
      { busDetails, type: 'location' },
      null,
      { sort: { timestamp: -1 } }
    );
    if (!location) {
      console.log(`No location found for busDetails: ${busDetails}`);
      return res.status(404).json({ message: 'No location found for this bus' });
    }
    res.json({
      driverId: location.driverId,
      busDetails: location.busDetails,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
    });
  } catch (error) {
    console.error('Error fetching driver location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bus-routes/route/:from/:to
router.get('/bus-routes/route/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;
    if (!from || !to) {
      return res.status(400).json({ message: 'From and To locations are required' });
    }

    // Find routes where 'from' and 'to' are in the bus_stops array
    const routes = await BusRoute.find({
      bus_stops: { $all: [from, to] },
    });

    if (routes.length === 0) {
      // Provide debug info for no matches
      const fromMatches = await BusRoute.find({ bus_stops: from });
      const toMatches = await BusRoute.find({ bus_stops: to });
      return res.status(404).json({
        message: 'No routes found for the specified locations',
        debug: {
          fromMatches: fromMatches.length,
          toMatches: toMatches.length,
        },
      });
    }

    // For each route, ensure stops are ordered correctly
    const formattedRoutes = routes.map((route) => {
      const fromIndex = route.bus_stops.indexOf(from);
      const toIndex = route.bus_stops.indexOf(to);
      let orderedStops = route.bus_stops;

      // If 'to' appears before 'from', reverse the stops for correct direction
      if (toIndex < fromIndex) {
        orderedStops = [...route.bus_stops].reverse();
      }

      return {
        _id: route._id,
        route_number: route.route_number,
        busDetails: route.busDetails || `BUS_${route.route_number}`,
        from,
        to,
        bus_stops: orderedStops,
        travel_time: route.travel_time || 'Unknown',
      };
    });

    res.json(formattedRoutes);
  } catch (error) {
    console.error('Error fetching bus routes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/trips (for saving trip details from driver)
router.post('/trips', async (req, res) => {
  try {
    const { driverId, from, to, startTime, busDetails } = req.body;
    if (!driverId || !from || !to || !busDetails) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const normalizedBusDetails = `BUS_${busDetails.trim().toUpperCase()}`; // Normalize
    const trip = new BusLocation({
      driverId,
      from,
      to,
      startTime: startTime || new Date().toISOString(),
      busDetails: normalizedBusDetails,
      type: 'trip', // Set type to 'trip'
      createdAt: new Date(),
    });
    const savedTrip = await trip.save(); // Save to buslocations collection
    res.json({ success: true, tripId: savedTrip._id });
  } catch (error) {
    console.error('Error saving trip details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;