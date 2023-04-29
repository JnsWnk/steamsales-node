const puppeteer = require("puppeteer");
const puppeteerExtra = require("puppeteer-extra");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const maxTries = 3;
puppeteerExtra.use(StealthPlugin());

let proxies = [];

async function getBrowserInstance(proxy) {
  const launchOptions = {
    executablePath:
      process.env.NODE_ENV == "production"
        ? process.env.EXECUTABLE_PATH
        : puppeteer.executablePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    headless: true,
  };

  if (proxy) {
    launchOptions.args.push(`--proxy-server=${proxy}`);
  }

  const browser = await puppeteerExtra.launch(launchOptions);
  return browser;
}

async function getWishlist(id) {
  const url = process.env.STEAM_WL_URL.replace("userid", id);
  console.log("WL URL: " + url, "ID: " + id);
  const request = await fetch(url);
  const wishlist = await request.json();
  const games = [];
  for (const game in wishlist) {
    if (wishlist[game].prerelease == 1) {
      continue;
    }
    const price = wishlist[game].subs[0].price / 100;
    const discount = wishlist[game].subs[0].discount_pct;
    const gameDetails = {
      name: wishlist[game].name,
      price: price,
      discount: discount == 0 ? "None" : discount + "%",
      discount_price: ((1 - discount / 100) * price).toFixed(2),
    };
    games.push(gameDetails);
  }
  return games;
}

async function getGameKeys(name) {
  const url = process.env.ALLKEYSHOP_URL.replace("gamename", getGameName(name));
  let list = [];
  let tries = 0;
  while (list.length == 0 && tries < maxTries) {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const browser = await getBrowserInstance(proxy);
    try {
      console.log("Trying proxy: " + proxy + " for " + name + "");
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 35000 });
      list = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("#offers_table > div")).map(
          (div) => ({
            name: div.querySelector(
              "span.x-offer-merchant-name.offers-merchant-name"
            )?.textContent,
            price: div.querySelector("span.x-offer-buy-btn-in-stock")
              ?.textContent,
          })
        );
      });
    } catch (err) {
      console.log("Proxy failed or took too long: " + proxy);
    } finally {
      browser.close();
      tries++;
      console.log("Tries: " + tries);
    }
  }
  return list;
}

function getGameName(name) {
  return name
    .replace(/[^a-z0-9 ]/gi, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function getProxies() {
  console.log("Getting proxies");
  const browser = await getBrowserInstance();
  try {
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
          const proxy = "" + ip + ":" + port;
          proxies.push(proxy);
          count++;
        }
      });
      return proxies;
    });
    proxies = proxyList;
    console.log("Got proxies: " + proxies.length);
  } catch (err) {
    console.error("Error when fetching proxies: " + err);
  } finally {
    await browser.close();
  }
}

module.exports = { getGameKeys, getWishlist, getProxies, getGameName };
