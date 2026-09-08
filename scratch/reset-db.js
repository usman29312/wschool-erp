const { sequelize } = require('../config/database');
const seedDatabase = require('../config/seeder');

async function reset() {
  try {
    console.log('Resetting database (dropping and recreating all tables)...');
    // Drop all tables and recreate them
    await sequelize.sync({ force: true });
    console.log('Database tables recreated successfully.');
    
    // Seed default admin, session, and classes
    await seedDatabase();
    console.log('Database seeded successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

reset();
