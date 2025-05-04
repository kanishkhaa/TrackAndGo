const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const busRoutes = require('./routes/busRoutes');
const apiRoutes = require('./routes/api');
const longDistanceRoutes = require('./routes/longDistanceRoutes');
const lostFoundRoutes = require('./routes/lostFoundRoutes');


// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/bus_data';

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the TrackNGo Bus Route API. Use /api/bus-routes for bus routes, /api for trip/location data, /api/long-distance for long-distance routes, and /api/lost-found for lost and found.' 
  });
});

// Connect to MongoDB
mongoose.connect(mongoURI, {})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/bus-routes', busRoutes);
app.use('/api', apiRoutes);
app.use('/api/long-distance', longDistanceRoutes);
app.use('/api/lost-found', lostFoundRoutes);

// Start the server
app.listen(port, '192.168.11.179', () => {
  console.log(`Server running on http://192.168.11.179:${port}`);
});