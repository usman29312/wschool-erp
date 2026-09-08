const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Fee = sequelize.define('Fee', {
  month: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
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
    type: DataTypes.ENUM('Paid', 'Pending', 'Partial'),
    allowNull: false,
    defaultValue: 'Pending'
  }
}, {
  tableName: 'fees',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'month', 'academic_year_id']
    }
  ]
});

module.exports = Fee;
