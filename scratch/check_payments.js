
const mysql = require("mysql2/promise");
async function check() {
  const conn = await mysql.createConnection({
    host: "gondola.proxy.rlwy.net", port: 20525,
    user: "root", password: "TJcbJYKRhAJJIQYLinJgiERELxXIPqkV",
    database: "railway"
  });
  const [payments] = await conn.query("SELECT * FROM fee_payments WHERE fee_id = 95 OR fee_id = 142");
  console.log(JSON.stringify(payments, null, 2));
  await conn.end();
}
check();

