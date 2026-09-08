const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FeeStructure = sequelize.define('FeeStructure', {
  monthly_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  admission_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  exam_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  other_charges: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  }
}, {
  tableName: 'fee_structures',
  indexes: [
    {
      unique: true,
      fields: ['class_id', 'academic_year_id']
    }
  ]
});

module.exports = FeeStructure;
