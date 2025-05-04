const express = require('express');
const router = express.Router();
const BusRoute = require('../models/BusRoute');


// Get all bus routes
router.get('/', async (req, res) => {
  try {
    const routes = await BusRoute.find();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific route by route_number
router.get('/:route_number', async (req, res) => {
  try {
    const route = await BusRoute.findOne({ route_number: req.params.route_number });
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json(route);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get routes by starting point
router.get('/from/:from', async (req, res) => {
  try {
    const routes = await BusRoute.find({ from: new RegExp(req.params.from, 'i') });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get routes by destination
router.get('/to/:to', async (req, res) => {
  try {
    const routes = await BusRoute.find({ to: new RegExp(req.params.to, 'i') });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get routes by from and to locations
router.get('/route/:from/:to', async (req, res) => {
  try {
    const routes = await BusRoute.find({
      from: new RegExp(req.params.from, 'i'),
      to: new RegExp(req.params.to, 'i')
    });
    if (routes.length === 0) {
      return res.status(404).json({ message: 'No routes found for the specified from and to locations' });
    }
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;