const express = require("express");
const {
    getUsers,
    createUser,
    getUser,
    deleteUser,
} = require("../services/userServices");

const authService = require("../services/authService");
const userRout = express.Router();
userRout.use(authService.protect);

userRout.route("/").get(getUsers).post(createUser);
userRout.route("/:id").get(getUser).delete(deleteUser);

module.exports = userRout;
