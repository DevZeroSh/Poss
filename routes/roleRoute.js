const express = require("express");
const {createRoleVlaidator, updateRoleVlaidator, getRolVlaidator, deleteRoleVlaidator} = require("../utils/validators/roleValidator");
const {getRole,createRole,getRoles,updataRole,deleteRole,} = require("../services/roleServices");



const roleRout = express.Router();

roleRout.route("/").get(getRoles).post(createRoleVlaidator,createRole);

roleRout.route("/:id").get(getRolVlaidator,getRole).put(updateRoleVlaidator,updataRole).delete(deleteRoleVlaidator,deleteRole);
module.exports = roleRout;
