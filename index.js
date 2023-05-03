const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { getProxies } = require("./utils/puppeteer");
const { connect } = require("./utils/db");

const app = express();

//Import routes
const auth = require("./routes/auth");
const games = require("./routes/games");
const user = require("./routes/user");

//middleware
app.use(cors());
app.use(express.json());

//Routes
app.use("/auth", auth);
app.use("/games", games);
app.use("/user", user);

async function startServer() {
  await connect();
  await getProxies();
  setInterval(async () => {
    console.log("Interval");
    await getProxies();
  }, 60 * 60 * 1000);

  app.listen(process.env.PORT || 4000, () => {
    console.log("Server started");
  });
}

startServer();

module.exports = app;
