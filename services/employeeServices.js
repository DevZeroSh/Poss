const asyncHandler = require("express-async-handler");
const employeeModel = require("../models/employeeModel");
const RoleModel = require("../models/roleModel");
const ApiError = require("../utils/apiError");
const generatePassword = require("../utils/tools/generatePassword");
//Tools
const sendEmail = require("../utils/sendEmail");
const isEmail = require("../utils/tools/isEmail");
const { getDashboardRoles } = require("./roleDashboardServices");
const { getPosRoles } = require("./rolePosServices");
const axios = require("axios");

//@desc Get list of employee
// @rout Get /api/user
// @access priveta
exports.getEmployees = asyncHandler(async (req, res) => {
    try {
        const employee = await employeeModel.find().populate({ path: "selectedRoles", select: "name _id" });

        res.status(200).json({ status: "true", data: employee });
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ status: "false", error: "Internal Server Error" });
    }
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
            req.body.password = employeePass;
            //Sned password to email
            await sendEmail({
                email: req.body.email,
                subject: "New Password",
                message: `Hello ${req.body.name}, Your password is ${employeePass}`,
            });
            //Create the employee
            const employee = await employeeModel.create(req.body);

            // //insert the user on the main server

            if (req.body.userType && req.body.userType === "normal") {
                try {
                    const createUserOnServer = await axios.post("http://localhost:4000/api/allusers/", {
                        userEmail: req.body.email,
                        subscribtion: req.body.subscribtion,
                        userType: req.body.userType,
                    });
                    //Continue here
                    console.log(createUserOnServer);
                } catch (error) {
                    console.log(error);
                }
            }

            res.status(201).json({
                status: "true",
                message: "Employee Inserted",
                data: employee,
            });
        } catch (error) {
            return next(new ApiError("There is an error in sending email", 500));
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
    const employee = await employeeModel.findById(id).populate({ path: "selectedRoles", select: "name _id" });
    if (!employee) {
        return next(new ApiError(`No employee by this id ${id}`, 404));
    } else {
        employee.password = undefined;
        employee.pin = undefined;
        employee.createdAt = undefined;
        employee.updatedAt = undefined;

        //4-get all roles
        const roles = await RoleModel.findById(employee.selectedRoles[0]);
        const dashboardRolesIds = roles.rolesDashboard;
        const posRolesIds = roles.rolesPos;

        const dashRoleName = await getDashboardRoles(dashboardRolesIds);
        const poseRoleName = await getPosRoles(posRolesIds);

        res.status(200).json({
            status: "true",
            data: employee,
            dashBoardRoles: dashRoleName,
            posRolesName: poseRoleName,
        });
    }
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
        return next(new ApiError(`There is no employee with this id ${id}`, 404));
    } else {
        res.status(200).json({
            status: "true",
            message: "Employee updated",
            data: employee,
        });
    }
});

//@desc Delete specific employee
// @rout Delete /api/employee/:id
// @access priveta
exports.deleteEmployee = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const employee = await employeeModel.findByIdAndDelete(id);
    if (!employee) {
        return next(new ApiError(`No employee by this id ${id}`, 404));
    }
    res.status(200).json({ status: "true", message: "Employee Deleted" });
});
