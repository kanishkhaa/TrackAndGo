// models/BusLocation.js
const mongoose = require('mongoose');

const busLocationSchema = new mongoose.Schema({
  driverId: { type: String, required: true },
  busDetails: { type: String, required: true },
  type: { type: String, enum: ['trip', 'location'], required: true },
  from: { type: String }, // Required for type: "trip"
  to: { type: String }, // Required for type: "trip"
  startTime: { type: String }, // Optional for type: "trip"
  latitude: { type: Number }, // Required for type: "location"
  longitude: { type: Number }, // Required for type: "location"
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BusLocation', busLocationSchema);