const express = require("express");
const { getEmployees, createEmployee, deleteEmployee, getEmployee, updateEmployee } = require("../services/employeeServices");
const { createEmployeeValidator, updateEmployeeValidator, getEmployeeVlaidator, deleteEmployeeVlaidator } = require("../utils/validators/employeeValidator");

const employeeRoute = express.Router();

employeeRoute.route("/").get(getEmployees).post(createEmployeeValidator,createEmployee);
employeeRoute.route("/:id").delete(deleteEmployeeVlaidator,deleteEmployee).get(getEmployeeVlaidator,getEmployee).put(updateEmployee);

module.exports = employeeRoute;