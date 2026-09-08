const express = require('express');
const router = express.Router();
const { Subject, Class, TeacherAssignment } = require('../models');
const { isAuthenticated } = require('./middleware');

// GET all subjects (optionally filtered by class_id)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { classId } = req.query;
    const filter = classId ? { where: { class_id: classId } } : {};
    const subjects = await Subject.findAll({
      ...filter,
      include: [{ model: Class, attributes: ['class_name', 'section'] }],
      order: [['subject_name', 'ASC']]
    });
    return res.json(subjects);
  } catch (error) {
    console.error('Fetch subjects error:', error);
    return res.status(500).json({ error: 'Failed to retrieve subjects.' });
  }
});

// POST create subject (Admin or Assigned Teacher)
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { subject_name, class_id, total_marks, passing_marks } = req.body;
    if (!subject_name || !class_id) {
      return res.status(400).json({ error: 'Subject Name and Class ID are required.' });
    }

    // If teacher, check if they are assigned to this class
    if (req.session.role === 'teacher') {
      const isAssigned = await TeacherAssignment.findOne({
        where: { teacher_id: req.session.teacherId, class_id }
      });
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not assigned to this class.' });
      }
    } else if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const subject = await Subject.create({
      subject_name,
      class_id,
      total_marks: total_marks || 100,
      passing_marks: passing_marks || 33,
      teacher_id: req.session.role === 'teacher' ? req.session.teacherId : null
    });

    return res.status(201).json(subject);
  } catch (error) {
    console.error('Create subject error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Subject with this name already exists in this class.' });
    }
    return res.status(500).json({ error: 'Failed to create subject.' });
  }
});

// DELETE subject (Admin or Creator/Assigned Teacher)
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    // If teacher, check if they are assigned to this class or if they created the subject
    if (req.session.role === 'teacher') {
      const isAssigned = await TeacherAssignment.findOne({
        where: { teacher_id: req.session.teacherId, class_id: subject.class_id }
      });
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not assigned to the class of this subject.' });
      }
    } else if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await subject.destroy();
    return res.json({ message: 'Subject deleted successfully.' });
  } catch (error) {
    console.error('Delete subject error:', error);
    return res.status(500).json({ error: 'Failed to delete subject.' });
  }
});

module.exports = router;
