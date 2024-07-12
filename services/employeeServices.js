const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const generatePassword = require("../utils/tools/generatePassword");
const { getDashboardRoles } = require("./roleDashboardServices");
const { getPosRoles } = require("./rolePosServices");
const axios = require("axios");
const rolesShcema = require("../models/roleModel");
const emoloyeeShcema = require("../models/employeeModel");
//Tools
const sendEmail = require("../utils/sendEmail");
const isEmail = require("../utils/tools/isEmail");
const createToken = require("../utils/createToken");

//@desc Get list of employee
// @rout Get /api/user
// @access private
exports.getEmployees = asyncHandler(async (req, res) => {
  try {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const employeeModel = db.model("Employee", emoloyeeShcema);

    db.model("Roles", rolesShcema);

    //const con = await createConnection(req.query.databaseName);
    const employee = await employeeModel
      .find()
      .populate({ path: "selectedRoles", select: "name _id" });
    res.status(200).json({ status: "true", data: employee });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ status: "false", error: "Internal Server Error" });
  }
});

//@desc Create specific employee
// @rout Post /api/employee
// @access private
exports.createEmployee = asyncHandler(async (req, res, next) => {
  const email = req.body.email;

  const dbName = req.body.databaseName;

  const db = mongoose.connection.useDb(dbName);

  const employeeModel = db.model("Employee", emoloyeeShcema);
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

      // //insert the user on the main server

      if (req.body.userType && req.body.userType === "normal") {
        try {
          const createUserOnServer = await axios.post(
            "http://ec2-16-171-21-186.eu-north-1.compute.amazonaws.com:4000/api/allusers/",
            {
              name: req.body.name,
              userEmail: req.body.email,
              subscribtion: req.body.subscribtion,
              userType: req.body.userType,
            }
          );
          //Continue here
        } catch (error) {
          console.log(error);
        }
      }
      const employee = await employeeModel.create(req.body);
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

exports.createEmployeeInPos = asyncHandler(async (req, res, next) => {
  const email = req.body.email;

  const dbName = req.query.databaseName;

  const db = mongoose.connection.useDb(dbName);

  const employeeModel = db.model("Employee", emoloyeeShcema);
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

      // //insert the user on the main server

      if (req.body.userType && req.body.userType === "normal") {
        try {
          const createUserOnServer = await axios.post(
            "http://ec2-16-171-21-186.eu-north-1.compute.amazonaws.com:4000/api/allusers/",
            {
              userEmail: req.body.email,
              subscribtion: req.body.subscribtion,
              userType: req.body.userType,
            }
          );
          //Continue here
        } catch (error) {
          console.log(error);
        }
      }
      const employee = await employeeModel.create(req.body);
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

//@desc get specific Employee by ID
// @rout Get /api/employee/:id
// @access private
exports.getEmployee = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;

  const db = mongoose.connection.useDb(dbName);
  const employeeModel = db.model("Employee", emoloyeeShcema);
  const rolesModel = db.model("Roles", rolesShcema);

  const employee = await employeeModel
    .findById(id)
    .populate({ path: "selectedRoles", select: "name _id" });
  if (!employee) {
    return next(new ApiError(`No employee by this id ${id}`, 404));
  } else {
    employee.password = undefined;
    employee.pin = undefined;
    employee.createdAt = undefined;
    employee.updatedAt = undefined;

    //4-get all roles
    const roles = await rolesModel.findById(employee.selectedRoles[0]);
    const dashboardRolesIds = roles.rolesDashboard;
    const posRolesIds = roles.rolesPos;

    const dashRoleName = await getDashboardRoles(dashboardRolesIds, db);
    const poseRoleName = await getPosRoles(posRolesIds, db);

    res.status(200).json({
      status: "true",
      data: employee,
      dashBoardRoles: dashRoleName,
      posRolesName: poseRoleName,
    });
  }
});

// @desc     Update employee password by ID
// @rout     PUT /api/updatePassword
// @access   Private
exports.updateEmployeePassword = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const employeeModel = db.model("Employee", emoloyeeShcema);
  db.model("Roles", rolesShcema);

  // Update user password based on user payload (req.user._id)
  const user = await employeeModel.findByIdAndUpdate(
    req.user._id,
    {
      password: await bcrypt.hash(req.body.newPassword, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  if (!user) {
    return new ApiError("User not found", 404);
  }

  // Generate Token
  const token = createToken(user._id);

  res.status(200).json({ data: user, token });
});

//@desc     Update user name
// @rout    Put /api/employee/updateName/
// @access  Private
exports.updateEmployee = asyncHandler(async (req, res, next) => {
  const { id } = req.query;

  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const employeeModel = db.model("Employee", emoloyeeShcema);
  const employee = await employeeModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!employee) {
    return next(new ApiError(`There is no employee with this id ${id}`, 404));
  } else {
    res.status(200).json({
      status: "true",
      message: "Name updated",
      data: employee,
    });
  }
});

//@desc Delete specific employee
// @rout Delete /api/employee/:id
// @access private
exports.deleteEmployee = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const employeeModel = db.model("Employee", emoloyeeShcema);

  const employee = await employeeModel.findByIdAndDelete(id);
  if (!employee) {
    return next(new ApiError(`No employee by this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Employee Deleted" });
});
