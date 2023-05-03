const { getBrowser } = require("../utils/puppeteer");

class KeysService {
  constructor() {
    this.keyurl = process.env.KEYS_URL;
    this.maxTries = 3;
  }

  async getGameKeys(name) {
    const url = this.keyurl.replace("gamename", getGameName(name));
    let list = [];
    let tries = 0;
    while (list.length == 0 && tries < maxTries) {
      const browser = await getBrowser(true);
      try {
        console.log("Trying proxy: " + proxy + " for " + name + "");
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle2", timeout: 35000 });
        list = await page.evaluate(() => {
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

  getGameName(name) {
    return name
      .replace(/[^a-z0-9 ]/gi, "")
      .trim()
      .replace(/\s+/g, "-");
  }
}
