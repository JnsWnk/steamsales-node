const UserService = require("../services/userService");
const { getDb } = require("../utils/db");

const userService = new UserService();

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await userService.createUser(name, email, password);
    res.status(200).json(user);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(409).send("User already exists");
    } else {
      console.log(err);
      res.status(500).send("Error registering user");
    }
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userService.loginUser(email, password);
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).send("Invalid credentials");
  }
};
