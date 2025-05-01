const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);