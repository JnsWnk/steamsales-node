const mysql = require("mysql2");

const pool = mysql.createPool(process.env.DATABASE_URL + "&connectionLimit=10");

async function getConnection() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      resolve(connection);
    });
  });
}

module.exports = { getConnection };
