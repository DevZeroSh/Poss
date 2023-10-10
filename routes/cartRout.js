const express = require("express");
const { addProductToCart } = require("../services/cartServices");
const authService = require('../services/authService');

const cartRout = express.Router();
cartRout.use(authService.protect);
cartRout.route("/").post(addProductToCart);


module.exports = cartRout;
