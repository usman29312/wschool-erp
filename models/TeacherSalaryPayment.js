const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeacherSalaryPayment = sequelize.define('TeacherSalaryPayment', {
  salary_record_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  payment_method: {
    type: DataTypes.ENUM('Cash', 'Bank Transfer', 'Check', 'Card'),
    allowNull: false,
    defaultValue: 'Cash'
  },
  notes: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'teacher_salary_payments'
});

module.exports = TeacherSalaryPayment;
