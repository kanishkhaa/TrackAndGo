const mongoose = require('mongoose');


const lostItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  type: { type: String, required: true },
  color: String,
  brand: String,
  uniqueIdentifiers: String,
  date: String,
  time: String,
  route: { type: String, required: true },
  station: { type: String, required: true },
  contactInfo: { type: String, required: true },
  image: String,
  status: { type: String, default: 'Pending', enum: ['Pending', 'Found', 'Claimed', 'Under Review'] },
  referenceNumber: { type: String, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.LostItem || mongoose.model('LostItem', lostItemSchema);