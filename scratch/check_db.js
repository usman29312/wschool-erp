const { AcademicYear, TeacherAssignment } = require('../models');

async function check() {
  try {
    const years = await AcademicYear.findAll();
    console.log('ACADEMIC YEARS:', JSON.stringify(years, null, 2));
    const assignments = await TeacherAssignment.findAll();
    console.log('ASSIGNMENTS:', JSON.stringify(assignments, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
