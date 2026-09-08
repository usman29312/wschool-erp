const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AcademicYear = sequelize.define('AcademicYear', {
  year_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'inactive'
  }
}, {
  tableName: 'academic_years'
});

module.exports = AcademicYear;
