const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// MongoDB connection URI (replace with your MongoDB URI if using Atlas)
const mongoURI = 'mongodb://localhost:27017/bus_data';

// Define the schema for bus routes
const busRouteSchema = new mongoose.Schema({
  route_number: String,
  from: String,
  to: String,
  operator: String,
  bus_stops: [String],
  daily_buses: mongoose.Mixed, // Mixed type to handle String or Number
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

const BusRoute = mongoose.model('BusRoute', busRouteSchema, 'bus_routes');

async function importData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Define paths to JSON files
    const fileNames = [
      'Route 1 to 10.json',
      'Route 11 to 20.json',
      'Route 21 to 30.json',
      'Route 31 to 40.json'
    ];
    const dataDir = path.join(__dirname, '../data');

    // Clear existing data (optional, remove if you want to append)
    await BusRoute.deleteMany({});
    console.log('Cleared existing data in bus_routes collection');

    // Process each JSON file
    for (const fileName of fileNames) {
      const filePath = path.join(dataDir, fileName);
      console.log(`Reading file: ${fileName}`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      // Extract routes from the coimbatore_city_bus_routes array
      const routes = jsonData.coimbatore_city_bus_routes;

      // Transform and insert routes
      const transformedRoutes = routes.map(route => ({
        route_number: route.route_number,
        from: route.from,
        to: route.to,
        operator: route.operator,
        bus_stops: route.bus_stops,
        daily_buses: route.daily_buses,
        travel_time: route.travel_time,
        timings: {
          from_start: {
            first_bus: route.timings[`from_${route.from.toLowerCase().replace(/\s+/g, '_')}`]?.first_bus || route.timings.from_gandhipuram?.first_bus || route.timings.from_ukkadam?.first_bus || route.timings.from_railway_station?.first_bus || route.timings.from_town_hall?.first_bus || route.timings.from_kalapatti?.first_bus || route.timings.from_sihs_colony?.first_bus,
            last_bus: route.timings[`from_${route.from.toLowerCase().replace(/\s+/g, '_')}`]?.last_bus || route.timings.from_gandhipuram?.last_bus || route.timings.from_ukkadam?.last_bus || route.timings.from_railway_station?.last_bus || route.timings.from_town_hall?.last_bus || route.timings.from_kalapatti?.last_bus || route.timings.from_sihs_colony?.last_bus,
            departures: route.timings[`from_${route.from.toLowerCase().replace(/\s+/g, '_')}`]?.departures || route.timings.from_gandhipuram?.departures || route.timings.from_ukkadam?.departures || route.timings.from_railway_station?.departures || route.timings.from_town_hall?.departures || route.timings.from_kalapatti?.departures || route.timings.from_sihs_colony?.departures,
            frequency: route.timings[`from_${route.from.toLowerCase().replace(/\s+/g, '_')}`]?.frequency
          },
          from_end: {
            first_bus: route.timings[`from_${route.to.toLowerCase().replace(/\s+/g, '_')}`]?.first_bus,
            last_bus: route.timings[`from_${route.to.toLowerCase().replace(/\s+/g, '_')}`]?.last_bus,
            departures: route.timings[`from_${route.to.toLowerCase().replace(/\s+/g, '_')}`]?.departures,
            frequency: route.timings[`from_${route.to.toLowerCase().replace(/\s+/g, '_')}`]?.frequency
          }
        }
      }));

      // Insert routes into the collection
      await BusRoute.insertMany(transformedRoutes);
      console.log(`Inserted routes from ${fileName}`);
    }

    console.log('Data import completed');
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the import function
importData();