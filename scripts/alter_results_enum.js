const { sequelize } = require('../config/database');

async function alter() {
  try {
    await sequelize.query('ALTER TABLE results MODIFY exam_type VARCHAR(255) NOT NULL');
    console.log('Successfully altered exam_type column.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
alter();
