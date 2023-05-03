const express = require("express");
const router = express.Router();

const keyController = require("../controllers/keysController");

const { EventEmitter } = require("events");
const eventEmitter = new EventEmitter();

router.get("/getKeys", keyController.getGameKeys);
router.get("/getKeysForWishlist", keyController.getKeysForWishlist);

// Still have to figure out where to put this
/* app.get("/eventStream", async (req, res) => {
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
    if (games && games.length > 0) {
      for (const game in games) {
        console.log(games[game]);
        try {
          const gameKeys = await getGameKeys(games[game].name);
          if (gameKeys.length > 0) {
            games[game]["seller"] = gameKeys[0].name;
            games[game]["key_price"] = gameKeys[0].price;
            games[game]["key_url"] = process.env.ALLKEYSHOP_URL.replace(
              "gamename",
              getGameName(games[game].name)
            );
          } else {
            games[game]["failed"] = true;
          }
        } catch (err) {
          console.log(err);
          games[game]["failed"] = true;
          continue;
        } finally {
          eventEmitter.emit("gameResponse", JSON.stringify(games[game]));
        }
      }
    }
    eventEmitter.emit("end");
  });
}); */
