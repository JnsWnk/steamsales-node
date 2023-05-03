const WishlistService = require("../services/wishlistService");
const KeysService = require("../services/keysService");

const wishlistService = new WishlistService();
const keysService = new KeysService();

exports.getGameKeys = async (req, res) => {
  const { name } = req.query;
  try {
    const keys = await keysService.getGameKeys(name);
    res.status(200).json(keys);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

exports.getKeysForWishlist = async (req, res) => {
  const id = req.params.id;
  try {
    const wishlist = await wishlistService.getWishlist(id);
    //TODO: Get keys for each game in wishlist
    res.sendStatus(200).json(wishlist);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};
