const { getBrowser } = require("../utils/puppeteer");

class KeysService {
  constructor() {
    this.keyurl = process.env.ALLKEYSHOP_URL;
    this.maxTries = 4;
  }

  // returns list of objects with name and price
  async getGameKeys(name) {
    const url = this.keyurl.replace("gamename", this.getGameName(name));
    let key;
    let tries = 0;
    while (!key && tries < this.maxTries) {
      const browser = await getBrowser(true);
      try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        let list = await page.evaluate(() => {
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
        const price = parseFloat(list[0].price.replace(/€|\$/, "").trim());
        key = {
          price: price,
          name: list[0].name,
        };
        console.log("Got keys for " + name);
      } catch (err) {
        console.log("Proxy failed or took too long.");
      } finally {
        browser.close();
        tries++;
      }
    }
    if (key) {
      return key;
    }
    console.log("Failed to get keys for " + name);
    return null;
  }

  getGameName(name) {
    return name
      .replace(/[^a-z0-9 ]/gi, "")
      .trim()
      .replace(/\s+/g, "-");
  }
}

module.exports = KeysService;
