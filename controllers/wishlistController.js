const WishlistService = require("../services/wishlistService");

const wishlistService = new WishlistService();

exports.getWishlist = async (req, res) => {
  const id = req.params.id;
  try {
    const games = await wishlistService.getWishlist(id);
    res.status(200).json(games);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};
