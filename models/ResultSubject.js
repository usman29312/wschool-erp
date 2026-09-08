const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ResultSubject = sequelize.define('ResultSubject', {
  marks: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'result_subjects',
  indexes: [
    {
      unique: true,
      fields: ['result_id', 'subject_id']
    }
  ]
});

module.exports = ResultSubject;
