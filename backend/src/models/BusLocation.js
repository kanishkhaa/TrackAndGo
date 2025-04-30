const mongoose = require('mongoose');

const busLocationSchema = new mongoose.Schema({
  driverId: { type: String, required: true },
  busDetails: { type: String },
  routeNumber: { type: String },
  crowdness: { type: String },
  startTime: { type: String },
  type: { type: String, enum: ['trip', 'location'], required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  timestamp: { type: Date, default: Date.now },
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  createdAt: { type: Date, default: Date.now },
});

busLocationSchema.pre('save', function (next) {
  if (this.type === 'trip') {
    if (!this.routeNumber || !this.crowdness || !this.startTime) {
      return next(new Error('Fields "routeNumber", "crowdness", and "startTime" are required for type "trip"'));
    }
  } else if (this.type === 'location') {
    if (this.latitude == null || this.longitude == null) {
      return next(new Error('Fields "latitude" and "longitude" are required for type "location"'));
    }
  }
  next();
});

module.exports = mongoose.model('BusLocation', busLocationSchema);