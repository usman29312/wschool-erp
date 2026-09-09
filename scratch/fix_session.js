const mysql = require('mysql2/promise');
async function fix() {
  const conn = await mysql.createConnection({
    host: 'gondola.proxy.rlwy.net',
    port: 20525,
    user: 'root',
    password: 'TJcbJYKRhAJJIQYLinJgiERELxXIPqkV',
    database: 'railway'
  });
  await conn.query("UPDATE academic_years SET status = 'inactive' WHERE id = 2");
  await conn.query("UPDATE academic_years SET status = 'active' WHERE id = 1");
  const [rows] = await conn.query('SELECT * FROM academic_years');
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
  console.log('DONE: 2026-2027 is now ACTIVE');
}
fix();
