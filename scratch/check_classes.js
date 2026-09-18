
const mysql = require("mysql2/promise");
async function check() {
  const conn = await mysql.createConnection({
    host: "gondola.proxy.rlwy.net", port: 20525,
    user: "root", password: "TJcbJYKRhAJJIQYLinJgiERELxXIPqkV",
    database: "railway"
  });
  const [cls] = await conn.query("SELECT * FROM classes");
  console.log(JSON.stringify(cls, null, 2));
  await conn.end();
}
check();

