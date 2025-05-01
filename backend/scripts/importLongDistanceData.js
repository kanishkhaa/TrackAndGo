const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const LongDistanceRoute = require('../src/models/LongDistanceRoute');

// MongoDB connection URI
const mongoURI = 'mongodb://localhost:27017/bus_data';

async function importLongDistanceData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Define path to JSON file
    const fileName = 'long_distance_route.json';
    const dataDir = path.join(__dirname, '../data');
    const filePath = path.join(dataDir, fileName);

    // Clear existing data (optional, remove if you want to append)
    await LongDistanceRoute.deleteMany({});
    console.log('Cleared existing data in long_distance_routes collection');

    // Read and parse JSON file
    console.log(`Reading file: ${fileName}`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    // Handle both single object and array cases
    const routes = Array.isArray(jsonData) ? jsonData : [jsonData];

    // Transform routes
    const transformedRoutes = routes.map(route => {
      // Extract 'from' and 'to' from route string (e.g., "Tiruppur to Thevaram")
      const [from, to] = route.route.split(' to ').map(str => str.trim());
      return {
        route: route.route,
        travel_time: route.travel_time,
        bus_stops: route.bus_stops,
        departures_from_start: route.departures_from_tiruppur || [], // Adjust if key varies
        from,
        to
      };
    });

    // Insert routes into the collection
    await LongDistanceRoute.insertMany(transformedRoutes);
    console.log(`Inserted routes from ${fileName}`);

    console.log('Long-distance data import completed');
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the import function
importLongDistanceData();