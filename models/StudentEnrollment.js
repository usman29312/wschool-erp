const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StudentEnrollment = sequelize.define('StudentEnrollment', {
  status: {
    type: DataTypes.ENUM('Active', 'Promoted', 'Not Promoted', 'Left', 'Graduated', 'Transferred'),
    allowNull: false,
    defaultValue: 'Active'
  },
  roll_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  promoted_from_enrollment_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  promoted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  promoted_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  remarks: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'student_enrollments',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'academic_year_id']
    }
  ]
});

module.exports = StudentEnrollment;

