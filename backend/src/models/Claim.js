const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  lostItemRef: { type: String, required: true },
  foundItemRef: { type: String, required: true },
  description: { type: String, required: true },
  userContact: { type: String, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected', 'Claim Requested', 'Under Review', 'Ready for Pickup', 'Claimed'] },
  submittedDate: { type: Date, default: Date.now },
  matchConfidence: { type: String, enum: ['High', 'Medium', 'Low'] },
  matchDetails: String,
});

module.exports = mongoose.models.Claim || mongoose.model('Claim', claimSchema);