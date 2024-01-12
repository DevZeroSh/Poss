const express = require("express");
const {
  getEmployees,
  createEmployee,
  deleteEmployee,
  getEmployee,
  updateEmployee,
} = require("../services/employeeServices");
const {
  createEmployeeValidator,
  updateEmployeeValidator,
  getEmployeeVlaidator,
  deleteEmployeeVlaidator,
} = require("../utils/validators/employeeValidator");
const authService = require("../services/authService");

const employeeRoute = express.Router();

employeeRoute
  .route("/")
  .get(getEmployees)
  .post(
    authService.protect,
    authService.allowedTo("new employee"),
    createEmployeeValidator,
    createEmployee
  );

employeeRoute
  .route("/create-employee")
  .post(createEmployeeValidator, createEmployee);

employeeRoute
  .route("/:id")
  .delete(
    authService.protect,
    authService.allowedTo("delete employee"),
    deleteEmployeeVlaidator,
    deleteEmployee
  )
  .get(authService.protect, getEmployeeVlaidator, getEmployee)
  .put(
    authService.protect,
    authService.allowedTo("edit employee"),
    updateEmployee
  );

module.exports = employeeRoute;
