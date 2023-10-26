const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const {
    createCustomar,
    getCustomars,
    getCustomar,
    updataCustomar,
    deleteCustomar,
} = require("../services/customarServices");
const {
    createCustomarVlaidator,
    updataCustomarVlaidator,
    getCustomarVlaidator,
    deleteCustomarVlaidator,
} = require("../utils/validators/customarValidator");

router.use(authService.protect);

router.route("/")
    .post(authService.allowedTo("new customer"),createCustomarVlaidator,createCustomar)
    .get(getCustomars);
router.route("/:id")
    .get(getCustomarVlaidator, getCustomar)
    .put(authService.allowedTo("edit customer"),updataCustomarVlaidator,updataCustomar)
    .delete(authService.allowedTo("delete customer"),deleteCustomarVlaidator,deleteCustomar);

module.exports = router;
