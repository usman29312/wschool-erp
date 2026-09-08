const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Class = sequelize.define('Class', {
  class_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  section: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'classes',
  indexes: [
    {
      unique: true,
      fields: ['class_name', 'section']
    }
  ]
});

module.exports = Class;
