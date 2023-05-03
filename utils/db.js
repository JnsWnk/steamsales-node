const mysql = require("mysql2");

let client;

async function connect() {
  return new Promise((resolve, reject) => {
    client = mysql.createConnection(process.env.DATABASE_URL);
    client.connect((err) => {
      if (err) {
        console.error("Error connecting to database:", err);
        reject(err);
      } else {
        console.log("Connected to database");
        resolve();
      }
    });
  });
}

function getDb() {
  if (!client) {
    throw new Error("Call connect first!");
  }
  return client;
}

module.exports = {
  connect,
  getDb,
};
