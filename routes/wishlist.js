const express = require("express");
const router = express.Router();

const wishlistController = require("../controllers/wishlistController");

router.get("/getWishlist", wishlistController.getWishlist);
