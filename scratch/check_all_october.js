
const mysql = require("mysql2/promise");
async function check() {
  const conn = await mysql.createConnection({
    host: "gondola.proxy.rlwy.net", port: 20525,
    user: "root", password: "TJcbJYKRhAJJIQYLinJgiERELxXIPqkV",
    database: "railway"
  });
  const [fees] = await conn.query("SELECT f.id, f.student_id, s.name, f.month, f.amount, f.paid_amount, f.remaining_amount, f.status, f.academic_year_id FROM fees f JOIN students s ON f.student_id = s.id WHERE s.name LIKE \"%Anaya%\" OR f.month = \"October\"");
  console.log(JSON.stringify(fees, null, 2));
  await conn.end();
}
check();

