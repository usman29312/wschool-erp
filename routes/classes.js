const express = require('express');
const router = express.Router();
const { Class } = require('../models');
const { isAuthenticated, isAdmin } = require('./middleware');

// GET all classes
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const classes = await Class.findAll({ order: [['class_name', 'ASC'], ['section', 'ASC']] });
    return res.json(classes);
  } catch (error) {
    console.error('Fetch classes error:', error);
    return res.status(500).json({ error: 'Failed to retrieve classes.' });
  }
});

// POST create class (Admin only)
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { class_name, section } = req.body;
    if (!class_name || !section) {
      return res.status(400).json({ error: 'Class Name and Section are required.' });
    }

    const newClass = await Class.create({ class_name, section });
    return res.status(201).json(newClass);
  } catch (error) {
    console.error('Create class error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'This class and section combination already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create class.' });
  }
});

// DELETE class (Admin only)
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found.' });
    }
    await cls.destroy();
    return res.json({ message: 'Class deleted successfully.' });
  } catch (error) {
    console.error('Delete class error:', error);
    return res.status(500).json({ error: 'Failed to delete class.' });
  }
});

module.exports = router;
