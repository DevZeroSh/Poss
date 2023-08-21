const express = require("express");
const {
  getUsers,
  createUser,
  getUser,
  deleteUser,
} = require("../services/userServices");

const userRout = express.Router();
userRout.route("/").get(getUsers).post(createUser);
userRout.route("/:id").get(getUser).delete(deleteUser);

module.exports = userRout;
