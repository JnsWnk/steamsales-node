const puppeteer = require("puppeteer");
const puppeteerExtra = require("puppeteer-extra");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteerExtra.use(StealthPlugin());

async function getGameKey(name, proxy, browser) {
  const url = process.env.ALLKEYSHOP_URL.replace("gamename", name);

  const address = "https://65.109.0.130:8080";
  console.log("address", address);

  try {
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle2", timeout: 70000 });
    //get page title
    const title = await page.title();
    console.log("title", title);

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
    console.log(list);
    return list;
  } catch (err) {
    console.log("fail", err);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { getGameKey };
