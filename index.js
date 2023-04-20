const express = require("express");
const chrome = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");
const useProxy = require("puppeteer-page-proxy");
const { EventEmitter } = require("events");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { getGameKey } = require("./scrape");

const saltRounds = 10;
const secret = process.env.SECRET;

const app = express();
app.use(cors());
app.use(express.json());

const eventEmitter = new EventEmitter();

let proxies = [];

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
            res.status(200).json({
              status: "success",
              token,
              user: { id: user.id, name: user.name, email: user.email },
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

app.get("/getKeys", async (req, res) => {
  //Get query params
  const { name } = req.query;
  const proxy = proxies[Math.floor(Math.random() * proxies.length)];
  const browser = await getBrowserInstance();
  const keys = await getGameKey(getGameName(name), proxy, browser);
  res.status(200).json(keys);
});

app.get("/getWishlist/:id", async (req, res) => {
  const id = req.params.id;
  const games = await getWishlist(id);
  console.log("Sending wishlist");
  res.status(200).json(games);
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

    for (const game in games) {
      console.log(games[game]);
      const gameKeys = await getGameKeys(games[game].name);
      if (gameKeys.length > 0) {
        games[game]["seller"] = gameKeys[0].name;
        games[game]["key_price"] = gameKeys[0].price;
      } else {
        games[game]["failed"] = true;
      }
      eventEmitter.emit("gameResponse", JSON.stringify(games[game]));
    }
    eventEmitter.emit("end");
  });
});

async function getBrowserInstance() {
  const browser = await puppeteer.launch({
    executablePath:
      process.env.NODE_ENV == "production"
        ? process.env.EXECUTABLE_PATH
        : puppeteer.executablePath(),
    args: [
      `--proxy-server=${address}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    headless: true,
  });
  return browser;
}

async function getWishlist(id) {
  const url = process.env.STEAM_WL_URL.replace("userid", id);

  const whishlist = await fetch(url).then((res) => res.json());
  const games = [];
  for (const game in whishlist) {
    if (whishlist[game].prerelease == 1) {
      continue;
    }
    const price = whishlist[game].subs[0].price / 100;
    const discount = whishlist[game].subs[0].discount_pct;
    const gameDetails = {
      name: whishlist[game].name,
      price: price,
      discount: discount,
      discount_price: (1 - discount / 100) * price,
    };
    games.push(gameDetails);
  }
  return games;
}

async function getGameKeys(name) {
  console.log("Getting keys for: " + name);
  const url = process.env.ALLKEYSHOP_URL.replace("gamename", getGameName(name));
  try {
    const browser = await getBrowserInstance();
    let page;
    attempts = 0;
    success = false;

    while (attempts < 5 && !success) {
      try {
        // Get Proxy TODO: doesnt quite work, maybe use proxy with browser
        page = await browser.newPage();
        proxy = proxies[Math.floor(Math.random() * proxies.length)];
        address = "https://" + proxy.ip + ":" + proxy.port;
        await useProxy(page, address);
        // Puppeteer query
        await page.goto(url, { waitUntil: "networkidle2", timeout: 50000 });
        const list = await page.evaluate(() => {
          return Array.from(
            document.querySelectorAll("#offers_table > div")
          ).map((div) => ({
            name: div.querySelector(
              "span.x-offer-merchant-name.offers-merchant-name"
            )?.textContent,
            price: div.querySelector("span.x-offer-buy-btn-in-stock")
              ?.textContent,
          }));
        });
        return list;
      } catch (err) {
        console.log(err);
        attempts++;
      }
    }
    if (!success) {
      return [];
    }
  } catch {
    return [];
  }
}

function getGameName(name) {
  return name
    .replace(/[^a-z0-9 ]/gi, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function getProxies() {
  try {
    console.log("Getting proxies");
    const browser = await getBrowserInstance();
    const page = await browser.newPage();
    await page.goto("https://www.sslproxies.org/");

    proxyList = await page.evaluate(() => {
      const proxies = [];
      let count = 0;
      document.querySelectorAll("tr").forEach((row) => {
        if (count >= 50) {
          return;
        }
        const ipElement = row.querySelector("td:nth-child(1)");
        const portElement = row.querySelector("td:nth-child(2)");
        if (ipElement?.textContent && portElement?.textContent) {
          const ip = ipElement.textContent.trim();
          const port = portElement.textContent.trim();
          const proxy = { ip, port };
          proxies.push(proxy);
          count++;
        }
      });
      return proxies;
    });
    proxies = proxyList;
  } catch (err) {
    console.error(err);
  }
}

app.listen(process.env.PORT || 4000, () => {
  console.log("Server started");
  getProxies();
  setInterval(async () => {
    console.log("Interval");
    await getProxies();
  }, 30 * 60 * 1000);
});

module.exports = app;
// TODO Add Proxies
/*
  try {
    const browser = await getBrowserInstance();
    const page = await browser.newPage();
    await page.goto("https://www.sslproxies.org/");

    proxyList = await page.evaluate(() => {
      const proxies: { ip: string; port: string }[] = [];
      let count = 0;
      document.querySelectorAll("tbody tr").forEach((row) => {
        console.log(row);
        if (count >= 10) {
          return;
        }
        const ipElement = row.querySelector("td:nth-child(1)");
        const portElement = row.querySelector("td:nth-child(2)");
        if (ipElement?.textContent && portElement?.textContent) {
          const ip = ipElement.textContent.trim();
          const port = portElement.textContent.trim();
          const proxy = { ip, port };
          proxies.push(proxy);
          count++;
        }
      });
      return proxies;
    });

    await browser.close();
    console.log(proxyList);
    res.status(200).json(proxyList);
  } catch {
    res.status(500);
  }
}



async function fetchWithProxy(url: string) {
  let proxyIndex = 0;
  let response;

  while (!response && proxyIndex < proxies.length) {
    const proxy = proxies[proxyIndex];
    const config = {
      proxy: {
        host: proxy.host,
        port: proxy.port,
        httpsAgent: new HttpsProxyAgent(`http://${proxy.host}:${proxy.port}`),
      },
    };
    try {
      response = await axios.get(url, config);
      console.log(`Request successful using proxy ${proxy.host}:${proxy.port}`);
      return response.data;
    } catch (error: any) {
      console.log(
        `Request failed using proxy ${proxy.host}:${proxy.port}: ${error.message}`
      );
      proxyIndex++;
    }
  }

  throw new Error("All proxies failed");
}

*/
