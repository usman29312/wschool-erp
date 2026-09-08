const path = require('path');
const { sequelize } = require('../config/database');
const Student = require('../models/Student');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Fetch all students ordered by creation date
    const students = await Student.findAll({
      order: [['createdAt', 'ASC']]
    });

    let currentRegNum = 2002312;
    let updateCount = 0;

    for (const student of students) {
      // Re-assign registration number sequentially
      student.registration_number = currentRegNum.toString();
      
      // Fallback guardian_phone to contact if contact is missing
      if (!student.contact || student.contact.trim() === '') {
        student.contact = student.guardian_phone;
      }

      await student.save();
      currentRegNum++;
      updateCount++;
    }

    console.log(`Successfully migrated ${updateCount} students.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();
