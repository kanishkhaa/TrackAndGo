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

// Pre-save middleware for conditional validation
busLocationSchema.pre('save', function (next) {
  if (this.type === 'trip') {
    if (!this.from || !this.to) {
      return next(new Error('Fields "from" and "to" are required for type "trip"'));
    }
  } else if (this.type === 'location') {
    if (this.latitude == null || this.longitude == null) {
      return next(new Error('Fields "latitude" and "longitude" are required for type "location"'));
    }
  }
  next();
});

module.exports = mongoose.model('BusLocation', busLocationSchema);