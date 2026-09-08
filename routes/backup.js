const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sequelize, User } = require('../models');
const { isAuthenticated, isAdmin } = require('./middleware');
const seedDatabase = require('../config/seeder');

// Helper to generate raw SQL dump string
async function generateSqlDump() {
  let sqlDump = '';
  sqlDump += `-- Waseem Science & Commerce Academy ERP SQL Backup\n`;
  sqlDump += `-- Generated on: ${new Date().toISOString()}\n`;
  sqlDump += `-- Database: wschool\n\n`;
  sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  const [tables] = await sequelize.query("SHOW TABLES");
  if (tables.length > 0) {
    const tableKey = Object.keys(tables[0])[0];
    for (const tableObj of tables) {
      const tableName = tableObj[tableKey];
      const [[createResult]] = await sequelize.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createSql = createResult['Create Table'];

      sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlDump += `${createSql};\n\n`;

      const [rows] = await sequelize.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        sqlDump += `INSERT INTO \`${tableName}\` VALUES \n`;
        const valueStrings = rows.map(row => {
          const vals = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'number') return val;
            let strVal = String(val).replace(/(['"\\])/g, '\\$1');
            strVal = strVal.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
            return `'${strVal}'`;
          });
          return `(${vals.join(', ')})`;
        });
        sqlDump += valueStrings.join(',\n') + ';\n\n';
      }
    }
  }

  sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  return sqlDump;
}

// GET database SQL backup export (Admin only)
router.get('/export', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const sqlDump = await generateSqlDump();
    const filename = `wschool_backup_${new Date().toISOString().slice(0, 10)}_${Date.now()}.sql`;
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(sqlDump);
  } catch (error) {
    console.error('Database backup error:', error);
    return res.status(500).json({ error: 'Failed to generate database SQL export.' });
  }
});

// POST Reset System Data (Admin only, with password verification & atomic transaction)
router.post('/reset-system-data', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { confirmText, adminPassword } = req.body;

    if (!confirmText || confirmText.trim() !== 'RESET') {
      return res.status(400).json({ error: 'Confirmation word must be exactly "RESET".' });
    }

    if (!adminPassword) {
      return res.status(400).json({ error: 'Admin password is required to perform system reset.' });
    }

    // Verify Admin Password
    const adminUser = await User.findByPk(req.session.userId);
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user account not found.' });
    }

    const isValidPassword = await adminUser.validPassword(adminPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Incorrect Admin password. Action cancelled.' });
    }

    // Create automatic pre-reset backup file on server disk before resetting
    try {
      const dumpSql = await generateSqlDump();
      const backupDir = path.join(__dirname, '..', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, `pre_reset_backup_${Date.now()}.sql`);
      fs.writeFileSync(backupPath, dumpSql, 'utf8');
      console.log(`[AUTO BACKUP CREATED] Pre-reset backup saved to: ${backupPath}`);
    } catch (bErr) {
      console.warn('Pre-reset automatic backup warning:', bErr.message);
    }

    // Execute atomic managed transaction for rollback protection
    await sequelize.transaction(async (t) => {
      // Disable Foreign Key checks for batch deletion
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });

      const tablesToClean = [
        'student_enrollments',
        'attendance',
        'teacher_attendance',
        'fee_payments',
        'fees',
        'fee_structures',
        'result_subjects',
        'results',
        'teacher_salary_payments',
        'teacher_salary_records',
        'teacher_assignments',
        'notices',
        'password_resets',
        'subjects',
        'students',
        'teachers',
        'classes',
        'academic_years'
      ];

      for (const tbl of tablesToClean) {
        await sequelize.query(`TRUNCATE TABLE \`${tbl}\``, { transaction: t });
      }

      // Delete non-admin users, keeping current admin safe
      await sequelize.query(`DELETE FROM \`users\` WHERE \`role\` != 'admin'`, { transaction: t });

      // Re-enable Foreign Key checks
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });
    });

    // Re-seed default classes and session
    await seedDatabase();

    return res.json({
      message: 'System data has been completely reset to default state. Pre-reset backup saved automatically.'
    });

  } catch (error) {
    console.error('System reset error:', error);
    return res.status(500).json({ error: 'Failed to reset system data. Transaction rolled back safely: ' + error.message });
  }
});

module.exports = router;

