class WishlistService {
  constructor() {
    this.steamUrl = process.env.STEAM_WL_URL;
  }

  async getWishlist(id) {
    const url = this.steamUrl.replace("userid", id);
    try {
      const request = await fetch(url);
      const wishlist = await request.json();
      const games = [];
      for (const game in wishlist) {
        if (
          wishlist[game].subs.length === 0 ||
          wishlist[game].prerelease == 1
        ) {
          continue;
        }
        const price = wishlist[game].subs[0].price / 100;
        const discount = wishlist[game].subs[0].discount_pct;
        const gameDetails = {
          name: wishlist[game].name,
          steampriceog: price,
          steampricedc: ((1 - discount / 100) * price).toFixed(2),
          imglink: wishlist[game].capsule,
          release: wishlist[game].release_date,
        };
        games.push(gameDetails);
      }
      return games;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

module.exports = WishlistService;
