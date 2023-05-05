const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { getProxies } = require("./utils/puppeteer");
const { getConnection } = require("./utils/db");

const app = express();

startServer();

//Import routes
const auth = require("./routes/auth");
const keys = require("./routes/keys");
const user = require("./routes/user");
const wishlist = require("./routes/wishlist");

//middleware
app.use(cors());
app.use(express.json());

//Routes
app.use("/auth", auth);
app.use("/keys", keys);
app.use("/user", user);
app.use("/wishlist", wishlist);

async function startServer() {
  const con = await getConnection();
  console.log("Connected to database", con.threadId);
  getProxies();
  setInterval(async () => {
    console.log("Interval");
    await getProxies();
  }, 60 * 60 * 1000);

  app.listen(process.env.PORT || 4000, () => {
    console.log("Server started");
  });
}

module.exports = app;
