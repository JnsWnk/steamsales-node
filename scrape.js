const puppeteer = require("puppeteer");

async function getGameKey(name, proxy) {
  const url = process.env.ALLKEYSHOP_URL.replace("gamename", getGameName(name));

  const address = "https://" + proxy.ip + ":" + proxy.port;

  const browser = await puppeteer.launch({
    executablePath:
      process.env.NODE_ENV == "production"
        ? process.env.EXECUTABLE_PATH
        : puppeteer.executablePath(),
    args: [
      //`--proxy-server=${address}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--single-process",
      "--no-zygote",
    ],
  });

  try {
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle2" });
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
