const express = require("express");
const chrome = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");
const useProxy = require("puppeteer-page-proxy");
const { EventEmitter } = require("events");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const eventEmitter = new EventEmitter();

let proxies = [];

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
  const options =
    process.env.AWS_REGION || process.env.AWS_LAMBDA_FUNCTION_VERSION
      ? {
          args: chrome.args,
          executablePath: await chrome.executablePath,
          headless: true,
          defaultViewport: chrome.defaultViewport,
        }
      : {
          args: [],
          executablePath: process.env.CHROME_LOCATION,
        };
  const browser = await puppeteer.launch(options);
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
