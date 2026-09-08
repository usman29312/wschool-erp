const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeacherSalaryRecord = sequelize.define('TeacherSalaryRecord', {
  month: {
    type: DataTypes.STRING,
    allowNull: false
  },
  basic_salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  paid_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  remaining_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Partial', 'Paid'),
    allowNull: false,
    defaultValue: 'Pending'
  }
}, {
  tableName: 'teacher_salary_records'
});

module.exports = TeacherSalaryRecord;
