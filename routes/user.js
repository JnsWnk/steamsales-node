const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

router.post("/updateUser", userController.updateUser);
router.post("/updatePassword", userController.updatePassword);
router.get("/getUser", userController.getUser);

module.exports = router;
