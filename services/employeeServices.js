const asyncHandler = require("express-async-handler");
const employeeModel = require("../models/employeeModel");
const ApiError = require("../utils/apiError");
const generatePassword = require("../utils/tools/generatePassword");
//Tools
const sendEmail = require("../utils/sendEmail");
const isEmail = require("../utils/tools/isEmail");

//@desc Get list of employee
// @rout Get /api/user
// @access priveta
exports.getEmployees = asyncHandler(async (req, res) => {
    const employee = await employeeModel
        .find({})
        .populate({ path: "selectedRoles", select: "name _id" });

    res.status(200).json({ status: "true", data: employee });
});

//@desc Create specific employee
// @rout Post /api/employee
// @access priveta
exports.createEmployee = asyncHandler(async (req, res, next) => {
    const email = req.body.email;
    //Check if the email format is true or not
    if (isEmail(email)) {
        try {
            //Generate Password
            const employeePass = generatePassword();
            //Sned password to email
            await sendEmail({
                email: req.body.email,
                subject: "New Password",
                message: `Hello ${req.body.name}, Your password is ${employeePass}`,
            });

            //Create the employee
            const employee = await employeeModel.create({
                name: req.body.name,
                email: req.body.email,
                pin: req.body.pin,
                password: employeePass,
                selectedRoles: req.body.selectedRoles,
            });
            res.status(201).json({
                status: "true",
                message: "Employee Inserted",
                data: employee,
            });
        } catch (error) {
            return next(
                new ApiError("There is an error in sending email", 500)
            );
        }
    } else {
        return next(new ApiError("There is an error in email format", 500));
    }
});

//@desc get specific Employee by id
// @rout Get /api/employee/:id
// @access priveta
exports.getEmployee = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const employee = await employeeModel
        .findById(id)
        .populate({ path: "selectedRoles", select: "name -_id" });
    if (!employee) {
        return next(new ApiError(`No employee by this id ${id}`, 404));
    }
    res.status(200).json({ status: "true", data: employee });
});

//@desc update specific Employee by id
// @rout Put /api/employee/:id
// @access priveta
exports.updateEmployee = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const employee = await employeeModel.findByIdAndUpdate(id, req.body, {
        new: true,
    });

    if (!employee) {
        return next(
            new ApiError(`There is no employee with this id ${id}`, 404)
        );
    } else {
        res.status(200).json({
            status: "true",
            message: "Employee updated",
            data: employee,
        });
    }
});

//@desc Delete specific employee(put it in archives)
// @rout Delete /api/employee/:id
// @access priveta
exports.deleteEmployee = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const employee = await employeeModel.findByIdAndUpdate(id, {
        archives: "true",
    });
    if (!employee) {
        return next(new ApiError(`No employee by this id ${id}`, 404));
    }
    res.status(200).json({ status: "true", message: "Employee Deleted" });
});
