const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subject = sequelize.define('Subject', {
  subject_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  total_marks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100
  },
  passing_marks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 33
  }
}, {
  tableName: 'subjects',
  indexes: [
    {
      unique: true,
      fields: ['class_id', 'subject_name']
    }
  ]
});

module.exports = Subject;
