const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 3306;
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'wschool';

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
});

async function initializeDatabase() {
  try {
    // Connect to MySQL server without selecting db to create it if it doesn't exist
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();
    
    // Authenticate the Sequelize instance
    await sequelize.authenticate();
    console.log('MySQL Database connection established successfully.');
  } catch (error) {
    console.error('Unable to initialize database connection:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  initializeDatabase
};
