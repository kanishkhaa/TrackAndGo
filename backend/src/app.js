const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const busRoutes = require('./routes/busRoutes');
const apiRoutes = require('./routes/api');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/bus_data';

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the TrackNGo Bus Route API. Use /api/bus-routes for bus routes and /api for trip/location data.' });
});

// Connect to MongoDB
mongoose.connect(mongoURI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/bus-routes', busRoutes); // Existing bus routes
app.use('/api', apiRoutes); // New routes for trips and locations

// Start the server
app.listen(port, '192.168.11.179', () => {
  console.log(`Server running on http://192.168.11.179:${port}`);
});