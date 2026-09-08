const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Result = sequelize.define('Result', {
  exam_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  grade: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('In Progress', 'Completed'),
    allowNull: false,
    defaultValue: 'In Progress'
  },
  overall_status: {
    type: DataTypes.ENUM('Pass', 'Fail'),
    allowNull: false,
    defaultValue: 'Pass'
  },
  total_marks: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  obtained_marks: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  published_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_locked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  locked_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  locked_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  archived_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  archived_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  remarks: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'results',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'exam_type', 'academic_year_id']
    }
  ]
});

module.exports = Result;
