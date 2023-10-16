const express = require("express");
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

const authService = require("../services/authService");
const router = express.Router();
router.use(authService.protect);

router.route("/")
    .post(authService.allowedTo("new customer"),createCustomarVlaidator,createCustomar)
    .get(authService.allowedTo("customer"), getCustomars);
router.route("/:id")
    .get(authService.allowedTo("customer"), getCustomarVlaidator, getCustomar)
    .put(authService.allowedTo("edit customer"),updataCustomarVlaidator,updataCustomar)
    .delete(authService.allowedTo("delete customer"),deleteCustomarVlaidator,deleteCustomar);

module.exports = router;
