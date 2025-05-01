const express = require('express');
const router = express.Router();
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const Notification = require('../models/Notification');

// Helper function to generate reference numbers
const generateReferenceNumber = (prefix) => {
  return `${prefix}-2025-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
};

// Smart matching logic
const calculateMatchConfidence = (lostItem, foundItem) => {
  let score = 0;
  if (lostItem.type === foundItem.type) score += 30;
  if (lostItem.color && foundItem.color && lostItem.color.toLowerCase() === foundItem.color.toLowerCase()) score += 20;
  if (lostItem.description.toLowerCase().includes(foundItem.description.toLowerCase()) || 
      foundItem.description.toLowerCase().includes(lostItem.description.toLowerCase())) score += 30;
  if (lostItem.route.toLowerCase() === foundItem.vehicleNumber.toLowerCase()) score += 20;

  if (score >= 80) return { confidence: 'High', details: 'Strong match based on type, color, description, and route' };
  if (score >= 50) return { confidence: 'Medium', details: 'Moderate match based on type and description' };
  return { confidence: 'Low', details: 'Weak match, verify details' };
};

// Report a lost item (Passenger)
router.post('/lost', async (req, res) => {
  try {
    const { description, type, color, brand, uniqueIdentifiers, date, time, route, station, contactInfo, image } = req.body;
    if (!description || !type || !route || !station || !contactInfo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const referenceNumber = generateReferenceNumber('LF');
    const lostItem = new LostItem({
      description,
      type,
      color,
      brand,
      uniqueIdentifiers,
      date,
      time,
      route,
      station,
      contactInfo,
      image,
      referenceNumber,
    });

    await lostItem.save();

    // Check for potential matches
    const foundItems = await FoundItem.find({ status: 'Stored' });
    let matches = [];
    for (let foundItem of foundItems) {
      const match = calculateMatchConfidence(lostItem, foundItem);
      if (match.confidence !== 'Low') {
        const claim = new Claim({
          lostItemRef: lostItem.referenceNumber,
          foundItemRef: foundItem.referenceNumber,
          description: lostItem.description,
          userContact: lostItem.contactInfo,
          status: 'Under Review',
          matchConfidence: match.confidence,
          matchDetails: match.details,
        });
        await claim.save();
        matches.push(claim);

        // Notify user
        const notification = new Notification({
          title: 'Potential Match Found',
          message: `A potential match was found for your lost item (${lostItem.referenceNumber}). Check the Claims tab.`,
          userId: lostItem.userId,
        });
        await notification.save();
      }
    }

    res.status(201).json({ message: 'Lost item reported', referenceNumber, matches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Report a found item (Driver/Staff)
router.post('/found', async (req, res) => {
  try {
    const { description, type, color, vehicleNumber, storageLocation, dateFound, timeFound, image } = req.body;
    if (!description || !type || !vehicleNumber || !storageLocation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const referenceNumber = generateReferenceNumber('FF');
    const foundItem = new FoundItem({
      description,
      type,
      color,
      vehicleNumber,
      storageLocation,
      dateFound,
      timeFound,
      image,
      referenceNumber,
    });

    await foundItem.save();

    // Check for potential matches
    const lostItems = await LostItem.find({ status: { $in: ['Pending', 'Under Review'] } });
    let matches = [];
    for (let lostItem of lostItems) {
      const match = calculateMatchConfidence(lostItem, foundItem);
      if (match.confidence !== 'Low') {
        const claim = new Claim({
          lostItemRef: lostItem.referenceNumber,
          foundItemRef: foundItem.referenceNumber,
          description: lostItem.description,
          userContact: lostItem.contactInfo,
          status: 'Under Review',
          matchConfidence: match.confidence,
          matchDetails: match.details,
        });
        await claim.save();
        matches.push(claim);

        // Notify user
        const notification = new Notification({
          title: 'Potential Match Found',
          message: `A potential match was found for your lost item (${lostItem.referenceNumber}). Check the Claims tab.`,
          userId: lostItem.userId,
        });
        await notification.save();
      }
    }

    res.status(201).json({ message: 'Found item reported', referenceNumber, matches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all lost items (Passenger)
router.get('/lost', async (req, res) => {
  try {
    const lostItems = await LostItem.find();
    res.json(lostItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all found items (Staff)
router.get('/found', async (req, res) => {
  try {
    const foundItems = await FoundItem.find();
    res.json(foundItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get claims (Passenger/Staff)
router.get('/claims', async (req, res) => {
  try {
    const claims = await Claim.find();
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Handle claim actions (Staff)
router.put('/claims/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const claim = await Claim.findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Update related items
    if (status === 'Approved' || status === 'Claimed') {
      await LostItem.findOneAndUpdate({ referenceNumber: claim.lostItemRef }, { status: 'Claimed' });
      await FoundItem.findOneAndUpdate({ referenceNumber: claim.foundItemRef }, { status: 'Claimed' });
    }

    // Notify user
    const notification = new Notification({
      title: `Claim ${status}`,
      message: `Your claim for ${claim.lostItemRef} has been ${status.toLowerCase()}.`,
      userId: claim.userId,
    });
    await notification.save();

    res.json({ message: `Claim ${status}`, claim });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Request a claim (Passenger)
router.post('/claims/request/:id', async (req, res) => {
  try {
    const claim = await Claim.findByIdAndUpdate(req.params.id, { status: 'Claim Requested' }, { new: true });
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const notification = new Notification({
      title: 'Claim Requested',
      message: `Your claim request for ${claim.lostItemRef} has been submitted.`,
      userId: claim.userId,
    });
    await notification.save();

    res.json({ message: 'Claim request submitted', claim });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get notifications (Passenger/Staff)
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ time: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;