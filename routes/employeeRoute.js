const express = require("express");
const {
    getEmployees,
    createEmployee,
    deleteEmployee,
    getEmployee,
    updateEmployee,
    createEmployeeInPos,
    updateEmployeePassword,
} = require("../services/employeeServices");
const {
    createEmployeeValidator,
    updateEmployeeValidator,
    updateNameValidator,
    getEmployeeVlaidator,
    deleteEmployeeVlaidator,
    updatePasswordValidator,
} = require("../utils/validators/employeeValidator");
const authService = require("../services/authService");

const employeeRoute = express.Router();

employeeRoute
    .route("/")
    .get(getEmployees)
    .post(
        authService.protect,
        authService.allowedTo("employee"),
        createEmployeeValidator,
        createEmployeeInPos
    );

employeeRoute.route("/create-employee").post(createEmployeeValidator, createEmployee);

employeeRoute
    .route("/:id")
    .delete(
        authService.protect,
        authService.allowedTo("delete employee"),
        deleteEmployeeVlaidator,
        deleteEmployee
    )
    .get(authService.protect, getEmployeeVlaidator, getEmployee);
// .put(authService.protect, authService.allowedTo("edit employee"), updateEmployee);

employeeRoute
    .route("/updateName")
    .put(authService.protect, /*updateNameValidator, */ updateEmployee);
employeeRoute
    .route("/updatePassword")
    .put(authService.protect, updatePasswordValidator, updateEmployeePassword);

module.exports = employeeRoute;
