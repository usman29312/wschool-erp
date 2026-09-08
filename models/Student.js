const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Student = sequelize.define('Student', {
  roll_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  registration_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  father_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: false
  },
  contact: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  admission_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  guardian_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  guardian_phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  emergency_contact: {
    type: DataTypes.STRING,
    allowNull: false
  },
  blood_group: {
    type: DataTypes.STRING,
    allowNull: true
  },
  previous_school: {
    type: DataTypes.STRING,
    allowNull: true
  },
  custom_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'students'
});

module.exports = Student;
