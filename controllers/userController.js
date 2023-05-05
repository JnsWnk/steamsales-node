const bcrypt = require("bcrypt");
const saltRounds = 10;
const secret = process.env.SECRET;

const UserService = require("../services/userService");

const userService = new UserService();

exports.updateUser = async (req, res) => {
  const { id, name, email, steamid } = req.body;
  console.log(req);
  console.log("Updating user: " + id + "SteamID: " + steamid);
  try {
    const user = await userService.updateUser(id, name, email, steamid);
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

exports.updatePassword = async (req, res) => {
  const { id, oldPassword, newPassword } = req.body;
  console.log("Updating password for user: " + id, oldPassword, newPassword);
  if (!newPassword || newPassword.length < 8) {
    res.status(400).send("Password must be at least 8 characters long");
    return;
  }
  try {
    const user = await userService.updatePassword(id, oldPassword, newPassword);
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

exports.getUser = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await userService.getUserById(id);
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

exports.getWishlist = async (req, res) => {
  const id = req.params.id;
  try {
    const games = await getWishlist(id);
    res.status(200).json(games);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};
