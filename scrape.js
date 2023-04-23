const puppeteer = require("puppeteer");
const puppeteerExtra = require("puppeteer-extra");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteerExtra.use(StealthPlugin());

let proxies = [];

async function getBrowserInstance() {
  const browser = await puppeteerExtra.launch({
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
  });
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
    try {
      // Get Proxy TODO: doesnt quite work, maybe use proxy with browser
      page = await browser.newPage();

      await page.goto(url, { waitUntil: "networkidle2", timeout: 50000 });
      const list = await page.evaluate(() => {
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
      return list;
    } catch (err) {
      console.log(err);
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

module.exports = { getGameKeys, getWishlist, getProxies };
