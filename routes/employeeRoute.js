const express = require("express");
const { getEmployees, createEmployee, deleteEmployee, getEmployee, updateEmployee } = require("../services/employeeServices");
const { createEmployeeValidator, updateEmployeeValidator, getEmployeeVlaidator, deleteEmployeeVlaidator } = require("../utils/validators/employeeValidator");
const authService = require('../services/authService');

const employeeRoute = express.Router();

employeeRoute.use(authService.protect);

employeeRoute.route("/")
    .get(authService.allowedTo("employee"),getEmployees)
    .post(authService.allowedTo("new employee"),createEmployeeValidator,createEmployee);
    
employeeRoute.route("/:id")
    .delete(authService.allowedTo("delete employee"),deleteEmployeeVlaidator,deleteEmployee)
    .get(authService.allowedTo("employee"),getEmployeeVlaidator,getEmployee)
    .put(authService.allowedTo("edit employee"),updateEmployee);

module.exports = employeeRoute;