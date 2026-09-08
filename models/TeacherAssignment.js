const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeacherAssignment = sequelize.define('TeacherAssignment', {}, {
  tableName: 'teacher_assignments',
  indexes: [
    {
      name: 'teacher_class_year_uniq',
      unique: true,
      fields: ['teacher_id', 'class_id', 'academic_year_id']
    }
  ]
});

module.exports = TeacherAssignment;
