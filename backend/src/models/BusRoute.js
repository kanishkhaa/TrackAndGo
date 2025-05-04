const mongoose = require('mongoose');



const busRouteSchema = new mongoose.Schema({
  route_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  from: {
    type: String,
    required: true,
    trim: true,
  },
  to: {
    type: String,
    required: true,
    trim: true,
  },
  operator: {
    type: String,
    required: true,
    trim: true,
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
  daily_buses: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  travel_time: {
    type: String,
    default: 'Unknown',
  },
  timings: {
    from_start: {
      first_bus: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format for first_bus'],
      },
      last_bus: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format for last_bus'],
      },
      departures: {
        type: [String],
        required: true,
        validate: {
          validator: (deps) =>
            deps.every((dep) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(dep)),
          message: 'All departures must be in HH:MM format',
        },
      },
      frequency: {
        type: String,
        default: 'Unknown',
      },
    },
    from_end: {
      first_bus: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format for first_bus'],
      },
      last_bus: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format for last_bus'],
      },
      departures: {
        type: [String],
        required: true,
        validate: {
          validator: (deps) =>
            deps.every((dep) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(dep)),
          message: 'All departures must be in HH:MM format',
        },
      },
      frequency: {
        type: String,
        default: 'Unknown',
      },
    },
  },
});

busRouteSchema.index({ route_number: 1 });

module.exports = mongoose.model('BusRoute', busRouteSchema, 'bus_routes');