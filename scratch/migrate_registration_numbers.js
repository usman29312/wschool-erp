const { sequelize } = require('../config/database');
const { Student } = require('../models');

async function migrateRegistrationNumbers() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    
    // Adjust Attendance ENUM (MySQL specific query to alter enum if needed, though Sequelize sync alter might handle it)
    await sequelize.query("ALTER TABLE attendance MODIFY COLUMN status ENUM('Present', 'Absent', 'Leave') NOT NULL;");

    const students = await Student.findAll({ order: [['id', 'ASC']] });
    let startReg = 2002312;
    for (const student of students) {
      student.registration_number = startReg.toString();
      await student.save();
      startReg++;
    }
    
    console.log(`Migrated ${students.length} students. Next registration number will be ${startReg}.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateRegistrationNumbers();
