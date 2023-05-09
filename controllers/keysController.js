const WishlistService = require("../services/wishlistService");
const KeysService = require("../services/keysService");
const GameService = require("../services/gameService");

const wishlistService = new WishlistService();
const keysService = new KeysService();
const gameService = new GameService();

exports.getGameKeys = async (req, res) => {
  const { name } = req.query;
  try {
    const keys = await keysService.getGameKeys(name);
    res.status(200).json(keys);
  } catch (err) {
    res.sendStatus(500);
  }
};

exports.getKeysForWishlist = async (req, res) => {
  const id = req.query.id;
  try {
    const wishlist = await wishlistService.getWishlist(id);
    for (const game in wishlist) {
      try {
        const dbGame = await gameService.getValidGameData(
          wishlist[game].name,
          wishlist[game].release
        );
        if (dbGame) {
          wishlist[game] = dbGame;
        } else {
          const key = await keysService.getGameKeys(wishlist[game].name);
          if (key) {
            wishlist[game] = {
              ...wishlist[game],
              keyprice: key.price,
              keyseller: key.name,
              lastupdated: new Date(),
            };
            await gameService.saveGame(wishlist[game]);
          } else {
            wishlist[game] = {
              ...wishlist[game],
              failed: true,
            };
          }
        }
      } catch (err) {
        console.error(err);
        wishlist[game] = {
          ...wishlist[game],
          failed: true,
        };
      }
    }
    res.status(200).json(wishlist);
  } catch (err) {
    console.error(err);
    res.status(404).send("Wishlist not found");
  }
};
