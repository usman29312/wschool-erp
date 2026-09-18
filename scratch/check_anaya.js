const mysql = require('mysql2/promise');
async function check() {
  const conn = await mysql.createConnection({
    host: 'gondola.proxy.rlwy.net', port: 20525,
    user: 'root', password: 'TJcbJYKRhAJJIQYLinJgiERELxXIPqkV',
    database: 'railway'
  });
  const [students] = await conn.query("SELECT id, name, custom_fee FROM students WHERE name LIKE '%Anaya%'");
  console.log('Student:', JSON.stringify(students, null, 2));
  if (students.length > 0) {
    const [fees] = await conn.query('SELECT id, month, amount, paid_amount, remaining_amount, status FROM fees WHERE student_id = ?', [students[0].id]);
    console.log('Fees:', JSON.stringify(fees, null, 2));
  }
  await conn.end();
}
check();
