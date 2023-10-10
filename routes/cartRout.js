const express = require("express");
const { addProductToCart } = require("../services/cartServices");


const cartRout = express.Router();

cartRout.route("/").post(addProductToCart);


module.exports = cartRout;
