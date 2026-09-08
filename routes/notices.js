const express = require('express');
const router = express.Router();
const { Notice } = require('../models');
const { isAuthenticated, isAdmin } = require('./middleware');
const { Op } = require('sequelize');

// GET active notices (Not expired yet)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const notices = await Notice.findAll({
      where: {
        expiry_date: {
          [Op.gte]: today
        }
      },
      order: [['date', 'DESC'], ['id', 'DESC']]
    });
    return res.json(notices);
  } catch (error) {
    console.error('Fetch active notices error:', error);
    return res.status(500).json({ error: 'Failed to load announcements.' });
  }
});

// GET all notices (Admin only - includes expired)
router.get('/all', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const notices = await Notice.findAll({
      order: [['date', 'DESC'], ['id', 'DESC']]
    });
    return res.json(notices);
  } catch (error) {
    console.error('Fetch all notices error:', error);
    return res.status(500).json({ error: 'Failed to load notices history.' });
  }
});

// POST create notice (Admin only)
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, message, date, expiry_date } = req.body;
    if (!title || !message || !date || !expiry_date) {
      return res.status(400).json({ error: 'Please provide title, message, post date, and expiry date.' });
    }

    const notice = await Notice.create({
      title,
      message,
      date,
      expiry_date
    });

    return res.status(201).json({ message: 'Announcement posted successfully.', notice });
  } catch (error) {
    console.error('Create notice error:', error);
    return res.status(500).json({ error: 'Failed to post announcement.' });
  }
});

// DELETE notice (Admin only)
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const notice = await Notice.findByPk(req.params.id);
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found.' });
    }
    await notice.destroy();
    return res.json({ message: 'Notice deleted successfully.' });
  } catch (error) {
    console.error('Delete notice error:', error);
    return res.status(500).json({ error: 'Failed to delete notice.' });
  }
});

module.exports = router;
