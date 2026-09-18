
const mysql = require("mysql2/promise");
async function fix() {
  const conn = await mysql.createConnection({
    host: "gondola.proxy.rlwy.net", port: 20525,
    user: "root", password: "TJcbJYKRhAJJIQYLinJgiERELxXIPqkV",
    database: "railway"
  });
  // Delete the extra 1000 payment (id 6)
  await conn.query("DELETE FROM fee_payments WHERE id = 6");
  
  // Update October fee 95 to 3000 amount and 3000 paid
  await conn.query("UPDATE fees SET amount = 3000.00, paid_amount = 3000.00, remaining_amount = 0.00, status = \"Paid\" WHERE id = 95");
  
  console.log("Anaya October fee updated to 3000/3000 Paid successfully!");
  await conn.end();
}
fix();

