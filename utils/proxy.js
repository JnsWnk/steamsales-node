const axios = require("axios");

const testProxy = async (proxy) => {
  const url = "https://www.google.com/";
  const timeout = 10000;

  try {
    const response = await axios.get(url, {
      proxy: {
        host: proxy.host,
        port: proxy.port,
      },
      timeout,
    });

    if (response.status === 200) {
      console.log(`Proxy ${proxy.host}:${proxy.port} is working.`);
    } else {
      console.log(
        `Proxy ${proxy.host}:${proxy.port} returned non-200 status code: ${response.status}`
      );
    }
  } catch (error) {
    console.log(`Proxy ${proxy.host}:${proxy.port} is not working.`);
  }
};

testProxies = async (proxies) => {};

module.exports = { testProxy, testProxies };
