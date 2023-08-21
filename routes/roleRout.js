const express = require("express");
const {
  getRole,
  createRole,
  getRoles,
  updataRole,
  deleteRole,
} = require("../services/roleSeervices");

const roleRout = express.Router();

roleRout.route("/").get(getRoles).post(createRole);

roleRout.route("/:id").get(getRole).put(updataRole).delete(deleteRole);
module.exports = roleRout;
