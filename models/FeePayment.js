const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FeePayment = sequelize.define('FeePayment', {
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Cash'
  },
  notes: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'fee_payments'
});

module.exports = FeePayment;
