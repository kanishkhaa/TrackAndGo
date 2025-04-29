const mongoose = require('mongoose');

const busRouteSchema = new mongoose.Schema({
  route_number: String,
  from: String,
  to: String,
  operator: String,
  bus_stops: [String],
  daily_buses: mongoose.Mixed,
  travel_time: String,
  timings: {
    from_start: {
      first_bus: String,
      last_bus: String,
      departures: [String],
      frequency: String
    },
    from_end: {
      first_bus: String,
      last_bus: String,
      departures: [String],
      frequency: String
    }
  }
});

module.exports = mongoose.model('BusRoute', busRouteSchema, 'bus_routes');