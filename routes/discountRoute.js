const express = require("express");
const {createDiscount, getDiscounts, getOneDiscount, updateDiscount, deleteDiscount} = require("../services/discountService");

const discountRoute = express.Router();

discountRoute.route("/").post(createDiscount).get(getDiscounts);
discountRoute.route("/:id").get(getOneDiscount).put(updateDiscount).delete(deleteDiscount);

module.exports=discountRoute;