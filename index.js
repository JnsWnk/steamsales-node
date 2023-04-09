const express = require("express");
const chrome = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

async function getBrowserInstance() {
  const options =
    process.env.AWS_REGION || process.env.AWS_LAMBDA_FUNCTION_VERSION
      ? {
          args: chrome.args,
          executablePath: await chrome.executablePath,
          headless: chrome.headless,
        }
      : {
          args: [],
          executablePath:
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        };
  const browser = await puppeteer.launch(options);
  return browser;
}

app.get("/api", async (req, res) => {
  try {
    let browser = await getBrowserInstance();

    let page = await browser.newPage();
    await page.goto("https://www.google.com");
    res.send(await page.title());
  } catch (err) {
    console.error(err);
    return null;
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
