const express = require('express');
const router = express.Router();
const BusLocation = require('../models/BusLocation');
const BusRoute = require('../models/BusRoute');
const UserSubscription = require('../models/UserSubscription');

router.post('/driver-locations', async (req, res) => {
  try {
    const { driverId, busDetails, latitude, longitude } = req.body;
    if (!driverId || !busDetails || !latitude || !longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const normalizedBusDetails = `BUS_${busDetails.trim().toUpperCase()}`;
    const location = new BusLocation({
      driverId,
      busDetails: normalizedBusDetails,
      type: 'location',
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

router.get('/driver-locations/:busDetails', async (req, res) => {
  try {
    let busDetails = req.params.busDetails.trim().toUpperCase();
    busDetails = busDetails.replace(/^BUS_+/i, '');
    busDetails = `BUS_${busDetails}`;
    
    const location = await BusLocation.findOne(
      { busDetails, type: 'location' },
      null,
      { sort: { timestamp: -1 } }
    );
    if (!location) {
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

router.get('/bus-routes', async (req, res) => {
  try {
    const routes = await BusRoute.find({}).select('_id route_number from to bus_stops operator travel_time timings daily_buses');
    const formattedRoutes = routes.map((route) => ({
      _id: route._id,
      route_number: route.route_number,
      busDetails: route.busDetails || `BUS_${route.route_number}`,
      from: route.from,
      to: route.to,
      bus_stops: route.bus_stops.map((stop) => ({
        name: stop.name,
        coordinates: stop.coordinates || { latitude: null, longitude: null },
      })),
      travel_time: route.travel_time || 'Unknown',
      timings: route.timings || {
        from_start: { departures: [], first_bus: '', last_bus: '', frequency: 'Unknown' },
        from_end: { departures: [], first_bus: '', last_bus: '', frequency: 'Unknown' },
      },
      operator: route.operator || 'Unknown',
      daily_buses: route.daily_buses || {},
    }));
    res.json(formattedRoutes);
  } catch (error) {
    console.error('Error fetching bus routes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/bus-routes/route/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;
    if (!from || !to) {
      return res.status(400).json({ message: 'From and To locations are required' });
    }

    const routes = await BusRoute.find({
      'bus_stops.name': { $all: [from, to] },
    });

    if (routes.length === 0) {
      const fromMatches = await BusRoute.find({ 'bus_stops.name': from });
      const toMatches = await BusRoute.find({ 'bus_stops.name': to });
      return res.status(404).json({
        message: 'No routes found for the specified locations',
        debug: {
          fromMatches: fromMatches.length,
          toMatches: toMatches.length,
        },
      });
    }

    const formattedRoutes = routes.map((route) => {
      const fromIndex = route.bus_stops.findIndex((stop) => stop.name === from);
      const toIndex = route.bus_stops.findIndex((stop) => stop.name === to);
      let orderedStops = route.bus_stops;

      if (toIndex < fromIndex) {
        orderedStops = [...route.bus_stops].reverse();
      }

      return {
        _id: route._id,
        route_number: route.route_number,
        busDetails: route.busDetails || `BUS_${route.route_number}`,
        from,
        to,
        bus_stops: orderedStops.map((stop) => ({
          name: stop.name,
          coordinates: stop.coordinates || { latitude: null, longitude: null },
        })),
        travel_time: route.travel_time || 'Unknown',
        timings: route.timings || {
          from_start: { departures: [], first_bus: '', last_bus: '', frequency: 'Unknown' },
          from_end: { departures: [], first_bus: '', last_bus: '', frequency: 'Unknown' },
        },
        operator: route.operator || 'Unknown',
        daily_buses: route.daily_buses || {},
      };
    });

    res.json(formattedRoutes);
  } catch (error) {
    console.error('Error fetching bus routes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/trips', async (req, res) => {
  try {
    const { driverId, routeNumber, crowdness, startTime, busDetails, currentLocation } = req.body;
    if (!driverId || !routeNumber || !crowdness || !startTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const normalizedBusDetails = `BUS_${busDetails.trim().toUpperCase()}`;
    const trip = new BusLocation({
      driverId,
      routeNumber,
      crowdness,
      startTime,
      busDetails: normalizedBusDetails,
      type: 'trip',
      currentLocation,
      createdAt: new Date(),
    });
    const savedTrip = await trip.save();
    res.json({ success: true, tripId: savedTrip._id });
  } catch (error) {
    console.error('Error saving trip details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/trips', async (req, res) => {
  try {
    const { routeNumber } = req.query;
    const query = { type: 'trip' };
    if (routeNumber) {
      query.routeNumber = routeNumber;
    }
    const trips = await BusLocation.find(query).sort({ createdAt: -1 }).limit(1);
    res.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/subscriptions', async (req, res) => {
  try {
    const { userId, route, selectedTime } = req.body;
    if (!userId || !route._id || !selectedTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const subscription = new UserSubscription({
      userId,
      routeId: route._id,
      route_number: route.route_number,
      from: route.from,
      to: route.to,
      busDetails: route.busDetails,
      operator: route.operator,
      travel_time: route.travel_time,
      timings: route.timings,
      bus_stops: route.bus_stops,
      selectedTime,
      notifications: {
        enabled: true,
        timeRange: ['All Day'],
        alertDelay: true,
        alertArrival: true,
        alertFullness: true,
        mute: false,
      },
    });
    await subscription.save();
    res.json({ success: true, subscriptionId: subscription._id });
  } catch (error) {
    console.error('Error saving subscription:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Subscription already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/subscriptions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const subscriptions = await UserSubscription.find({ userId });
    const formattedSubscriptions = subscriptions.map((sub) => ({
      _id: sub.routeId,
      route_number: sub.route_number,
      busDetails: sub.busDetails,
      from: sub.from,
      to: sub.to,
      bus_stops: sub.bus_stops || [],
      travel_time: sub.travel_time,
      timings: sub.timings,
      operator: sub.operator,
      selectedTime: sub.selectedTime,
      notifications: sub.notifications,
      eta: 'Calculating...',
      delay: false,
    }));
    res.json(formattedSubscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/subscriptions/:userId/:routeId', async (req, res) => {
  try {
    const { userId, routeId } = req.params;
    console.log(`Deleting subscription for user ${userId}, route ${routeId}`);
    const result = await UserSubscription.deleteOne({ userId, routeId });
    if (result.deletedCount === 0) {
      console.log('No subscription found');
      return res.status(404).json({ message: 'Subscription not found' });
    }
    console.log('Subscription deleted successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;