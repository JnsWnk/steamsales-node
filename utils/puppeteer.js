const puppeteer = require("puppeteer");
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteerExtra.use(StealthPlugin());

let proxies = [];

async function getBrowser(withProxy = false) {
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

  if (withProxy) {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    console.log(proxy);
    launchOptions.args.push(`--proxy-server=${proxy}`);
  }

  const browser = await puppeteerExtra.launch(launchOptions);
  return browser;
}

async function getProxies() {
  console.log("Getting proxies");
  const browser = await getBrowser();
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

module.exports = {
  getBrowser,
  getProxies,
};
