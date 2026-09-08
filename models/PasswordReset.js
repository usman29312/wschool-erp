const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PasswordReset = sequelize.define('PasswordReset', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  target_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  purpose: {
    type: DataTypes.ENUM('password_reset', 'recovery_verification'),
    defaultValue: 'password_reset'
  },
  otp_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reset_token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  resend_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'password_resets'
});

module.exports = PasswordReset;
