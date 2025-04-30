const mongoose = require('mongoose');

const userSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  routeId: { type: String, required: true },
  route_number: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  busDetails: { type: String },
  operator: { type: String },
  travel_time: { type: String },
  timings: {
    from_start: {
      first_bus: { type: String },
      last_bus: { type: String },
      departures: { type: [String], default: [] },
      frequency: { type: String },
    },
    from_end: {
      first_bus: { type: String },
      last_bus: { type: String },
      departures: { type: [String], default: [] },
      frequency: { type: String },
    },
  },
  bus_stops: [
    {
      name: { type: String, required: true },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
  ],
  selectedTime: { type: String, required: true },
  notifications: {
    enabled: { type: Boolean, default: true },
    timeRange: { type: [String], default: ['All Day'] },
    alertDelay: { type: Boolean, default: true },
    alertArrival: { type: Boolean, default: true },
    alertFullness: { type: Boolean, default: true },
    mute: { type: Boolean, default: false },
  },
}, { timestamps: true });

userSubscriptionSchema.index({ userId: 1, routeId: 1 }, { unique: true });

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);