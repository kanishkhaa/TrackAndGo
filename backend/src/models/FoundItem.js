const mongoose = require('mongoose');

// Define the schema
const foundItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  type: { type: String, required: true },
  color: String,
  vehicleNumber: { type: String, required: true },
  storageLocation: { type: String, required: true },
  dateFound: String,
  timeFound: String,
  image: String,
  status: { type: String, default: 'Stored', enum: ['Stored', 'Claimed'] },
  referenceNumber: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});

// Export the model, ensuring it is only defined once
module.exports = mongoose.models.FoundItem || mongoose.model('FoundItem', foundItemSchema);