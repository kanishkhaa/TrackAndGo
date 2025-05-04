const mongoose = require('mongoose');


const longDistanceRouteSchema = new mongoose.Schema({
  route: String,
  travel_time: String,
  bus_stops: [String],
  departures_from_start: [String],
  from: String, // Derived from route (e.g., "Tiruppur" from "Tiruppur to Thevaram")
  to: String   // Derived from route (e.g., "Thevaram" from "Tiruppur to Thevaram")
});

module.exports = mongoose.model('LongDistanceRoute', longDistanceRouteSchema, 'long_distance_routes');