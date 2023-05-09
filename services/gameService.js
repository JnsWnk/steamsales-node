const { getConnection } = require("../utils/db");

class GameService {
  async getGameData(name, releaseDate) {
    const connection = await getConnection();
    try {
      const [rows, fields] = await connection
        .promise()
        .query("SELECT * FROM games WHERE gamename = ? AND releasedate = ?", [
          name,
          releaseDate,
        ]);
      if (rows.length > 0) {
        return rows[0];
      }
      return null;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getValidGameData(name, releaseDate) {
    try {
      const game = await this.getGameData(name, releaseDate);
      if (game) {
        const date = new Date();
        const lastUpdated = new Date(game.lastupdated);
        const diff = Math.abs(date - lastUpdated);
        const hours = Math.floor(diff / 36e5);
        if (hours < 24) {
          return game;
        }
      }
      return null;
    } catch (err) {
      throw err;
    }
  }

  async saveGame(game) {
    const connection = await getConnection();
    console.log("Saving game: ", game.name);
    try {
      const res = await connection.execute(
        `INSERT INTO games (gamename, releasedate, steampriceog, steampricedc, keyprice, keyseller, imglink, lastupdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE steampriceog = ?, steampricedc = ?, keyprice = ?, keyseller = ?, lastupdated = ?`,
        [
          game.name,
          game.release,
          game.steampriceog,
          game.steampricedc,
          game.keyprice,
          game.keyseller,
          game.imglink,
          game.lastupdated,
          game.steampriceog,
          game.steampricedc,
          game.keyprice,
          game.keyseller,
          game.lastupdated,
        ]
      );
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

module.exports = GameService;
