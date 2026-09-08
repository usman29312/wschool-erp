const express = require('express');
const router = express.Router();
const { AcademicYear } = require('../models');
const { isAuthenticated, isAdmin } = require('./middleware');

// GET all sessions
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const sessions = await AcademicYear.findAll({ order: [['year_name', 'DESC']] });
    return res.json(sessions);
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return res.status(500).json({ error: 'Failed to retrieve academic sessions.' });
  }
});

// POST create session (Admin only)
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { year_name, status } = req.body;
    if (!year_name) {
      return res.status(400).json({ error: 'Session name is required (e.g. 2025-2026).' });
    }

    // If setting active, deactivate all others first
    if (status === 'active') {
      await AcademicYear.update({ status: 'inactive' }, { where: {} });
    }

    const session = await AcademicYear.create({
      year_name,
      status: status || 'inactive'
    });

    return res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Academic session already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create academic session.' });
  }
});

// PUT update session (Admin only)
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { year_name, status } = req.body;
    const session = await AcademicYear.findByPk(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Academic session not found.' });
    }

    if (status === 'active') {
      await AcademicYear.update({ status: 'inactive' }, { where: {} });
    }

    session.year_name = year_name || session.year_name;
    session.status = status || session.status;
    await session.save();

    return res.json(session);
  } catch (error) {
    console.error('Update session error:', error);
    return res.status(500).json({ error: 'Failed to update academic session.' });
  }
});

module.exports = router;
