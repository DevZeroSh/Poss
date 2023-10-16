const express = require("express");
const {
    createDiscount,
    getDiscounts,
    getOneDiscount,
    updateDiscount,
    deleteDiscount,
} = require("../services/discountService");
const authService = require("../services/authService");

const discountRoute = express.Router();

//prmisstions
discountRoute.use(authService.protect);

discountRoute.route("/")
    .post(authService.allowedTo("new discount"), createDiscount)
    .get(authService.allowedTo("discount"),getDiscounts);
    
discountRoute.route("/:id")
    .get(authService.allowedTo("discount"),getOneDiscount)
    .put(authService.allowedTo("edit discount"),updateDiscount)
    .delete(authService.allowedTo("delete discount"),deleteDiscount);

module.exports = discountRoute;
