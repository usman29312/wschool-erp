const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeacherAttendance = sequelize.define('TeacherAttendance', {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Present', 'Absent', 'Leave'),
    allowNull: false
  }
}, {
  tableName: 'teacher_attendance',
  indexes: [
    {
      unique: true,
      fields: ['teacher_id', 'date']
    }
  ]
});

module.exports = TeacherAttendance;
