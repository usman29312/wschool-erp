const { initializeDatabase, sequelize } = require('C:/Users/Admin/Desktop/course/wschool/config/database');
const { User, Class, AcademicYear } = require('C:/Users/Admin/Desktop/course/wschool/models');

async function testDatabase() {
  console.log('--- Waseem Academy Database Self-Test ---');
  try {
    // 1. Initialize
    await initializeDatabase();
    
    // 2. Sync
    await sequelize.sync({ alter: true });
    console.log('✔ Database synced successfully.');

    // 3. Check Admin
    const admins = await User.count({ where: { role: 'admin' } });
    console.log(`✔ Admin accounts found: ${admins}`);
    
    // 4. Check Classes
    const classes = await Class.count();
    console.log(`✔ Configured classes found: ${classes}`);

    // 5. Check Active session
    const active = await AcademicYear.findOne({ where: { status: 'active' } });
    console.log(`✔ Active academic session: ${active ? active.year_name : 'None'}`);

    console.log('--- DB connection self-test PASSED ---');
    process.exit(0);
  } catch (error) {
    console.error('✖ DB connection self-test FAILED:', error);
    process.exit(1);
  }
}

testDatabase();
