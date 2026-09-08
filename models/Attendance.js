const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Present', 'Absent', 'Leave'),
    allowNull: false
  }
}, {
  tableName: 'attendance',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'class_id', 'date', 'academic_year_id']
    }
  ]
});

module.exports = Attendance;
