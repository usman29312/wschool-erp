
const mysql = require("mysql2/promise");
async function check() {
  const conn = await mysql.createConnection({
    host: "gondola.proxy.rlwy.net", port: 20525,
    user: "root", password: "TJcbJYKRhAJJIQYLinJgiERELxXIPqkV",
    database: "railway"
  });
  const [fs] = await conn.query("SELECT * FROM fee_structures");
  console.log(JSON.stringify(fs, null, 2));
  await conn.end();
}
check();

