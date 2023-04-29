const express = require("express");
const { EventEmitter } = require("events");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const {
  getGameKeys,
  getWishlist,
  getProxies,
  getGameName,
} = require("./scrape");

const saltRounds = 10;
const secret = process.env.SECRET;

const app = express();
app.use(cors());
app.use(express.json());

const eventEmitter = new EventEmitter();

const connection = mysql.createConnection(process.env.DATABASE_URL);
console.log("Connected to database");

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, saltRounds);
    const results = await connection
      .promise()
      .query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [
        name,
        email,
        hash,
      ]);
    res.sendStatus(200);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(409).send("User already exists");
    } else {
      console.log(err);
      res.status(500).send("Error registering user");
    }
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results, fields) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        if (results.length > 0) {
          const match = await bcrypt.compare(password, results[0].password);
          if (match) {
            const user = results[0];
            const token = jwt.sign({ id: user.id }, secret, {
              expiresIn: process.env.EXPIRES,
            });
            console.log("User logged in: " + user.steamid);
            res.status(200).json({
              status: "success",
              token,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                steamid: user.steamid || null,
              },
            });
          } else {
            res.status(401).send("Invalid credentials");
          }
        } else {
          res.status(401).send("Invalid credentials");
        }
      }
    }
  );
});

app.post("/updateUser", async (req, res) => {
  const { id, name, email, steamid } = req.body;
  console.log("Updating user: " + id + "SteamID: " + steamid);
  connection.query(
    "UPDATE users SET name = ?, email = ?, steamid = ? WHERE id = ?",
    [name, email, steamid, id],

    async (err, results, fields) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        console.log(results);
        if (results.affectedRows > 0) {
          res.status(200).send("User updated");
        } else {
          res.status(401).send("User with this id doesnt exist.");
        }
      }
    }
  );
});

app.post("/updatePassword", async (req, res) => {
  const { id, newPassword } = req.body;
  console.log("Updating password for user: " + id);
  if (!newPassword || newPassword.length < 8) {
    res.status(400).send("Password must be at least 8 characters long");
    return;
  }
  const hash = await bcrypt.hash(newPassword, saltRounds);
  connection.query(
    "UPDATE users SET password = ? WHERE id = ?",
    [hash, id],
    async (err, results, fields) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        console.log(results);
        if (results.affectedRows > 0) {
          res.status(200).send("Password updated");
        } else {
          res.status(401).send("No user with this id");
        }
      }
    }
  );
});

app.get("/getUser/:id", async (req, res) => {
  const id = req.params.id;
  connection.query(
    "SELECT * FROM users WHERE id = ?",
    [id],
    async (err, results, fields) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        if (results.length > 0) {
          const user = results[0];
          const token = jwt.sign({ id: user.id }, secret, {
            expiresIn: process.env.EXPIRES,
          });
          res.status(200).json({
            status: "success",
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              steamid: user.steamid || null,
            },
          });
        } else {
          res.status(401).send("No user with this id");
        }
      }
    }
  );
});

app.get("/getKeys", async (req, res) => {
  //Get query params
  const { name } = req.query;
  try {
    const keys = await getGameKeys(name);
    res.status(200).json(keys);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/getWishlist/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const games = await getWishlist(id);
    console.log("Sending wishlist");
    res.status(200).json(games);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.get("/getDeals/:id", async (req, res) => {
  const id = req.params.id;
  console.log("Request for: " + id);
  try {
    const games = await getWishlist(id);
    eventEmitter.emit("startEventStream", games);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.get("/eventStream", async (req, res) => {
  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${data}\n\n`);
  };

  eventEmitter.on("gameResponse", (data) => {
    console.log("sending: " + data);
    sendEvent("gameResponse", data);
  });

  eventEmitter.on("end", () => {
    sendEvent("end", "end");
    res.end();
  });

  req.on("close", () => {
    eventEmitter.removeAllListeners();
  });

  eventEmitter.once("startEventStream", async (games) => {
    console.log("Starting event stream");
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    if (games && games.length > 0) {
      for (const game in games) {
        console.log(games[game]);
        try {
          const gameKeys = await getGameKeys(games[game].name);
          if (gameKeys.length > 0) {
            games[game]["seller"] = gameKeys[0].name;
            games[game]["key_price"] = gameKeys[0].price;
            games[game]["key_url"] = process.env.ALLKEYSHOP_URL.replace(
              "gamename",
              getGameName(games[game].name)
            );
          } else {
            games[game]["failed"] = true;
          }
        } catch (err) {
          console.log(err);
          games[game]["failed"] = true;
          continue;
        } finally {
          eventEmitter.emit("gameResponse", JSON.stringify(games[game]));
        }
      }
    }
    eventEmitter.emit("end");
  });
});

app.listen(process.env.PORT || 4000, () => {
  console.log("Server started");
  getProxies();
  setInterval(async () => {
    console.log("Interval");
    await getProxies();
  }, 30 * 60 * 1000);
});

module.exports = app;
