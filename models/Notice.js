const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notice = sequelize.define('Notice', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'notices'
});

module.exports = Notice;
