const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const { getDashboardRoles } = require("./roleDashboardServices");
const { getPosRoles } = require("./rolePosServices");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const emoloyeeShcema = require("../models/employeeModel");
const rolesShcema = require("../models/roleModel");

exports.login = asyncHandler(async (req, res, next) => {
    //here search for employee using this connection
    try {
        const dbName = req.query.databaseName;

        const subscribtionId = req.query.subscribtionId;
        const db = mongoose.connection.useDb(dbName);

        const employeeModel = db.model("Employee", emoloyeeShcema);
        const rolesModel = db.model("Roles", rolesShcema);

        //const companyPool = await req.companyPool;

        const user = await employeeModel.findOne({ email: req.body.email });
        if (!user) {
            return next(new ApiError("Incorrect email", 401));
        }
        //Check if the password is correct
        const passwordMatch = await bcrypt.compare(req.body.password, user.password);
        if (!passwordMatch) {
            return next(new ApiError("Incorrect Password", 401));
        }
        //Check if the user is active
        if (user.archives === "true") {
            return next(new ApiError("The account is not active", 401));
        }
        // 5. Remove the password and pin from the user object
        // Set sensitive fields to undefined
        user.password = undefined;
        user.pin = undefined;

        //continu here
        try {
            const roles = await rolesModel.findOne({ _id: user.selectedRoles[0] });

            const { rolesDashboard, rolesPos } = roles;

            //get all roles name

            const dashRoleName = await getDashboardRoles(rolesDashboard, db);
            const posRoleName = await getPosRoles(rolesPos, db);

            const token = createToken(user._id);

            res.status(200).json({
                status: "true",
                data: user,
                dashBoardRoles: dashRoleName,
                posRolesName: posRoleName,
                token,
                dbName,
                subscribtionId,
            });
        } catch (error) {
            console.error("Error finding roles:", error);
        }
    } catch (error) {
        console.error("Error searching for employee:", error);
    }
});

// @desc   make sure the user is logged in sys
exports.protect = asyncHandler(async (req, res, next) => {
    //1-Check if token exist, if exist get
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const employeeModel = db.model("Employee", emoloyeeShcema);

    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(new ApiError("Not login", 401));
    } else {
        try {
            //2- Verify token (no change happens, expired token)
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            //3-Check if user exists
            const curentUser = await employeeModel.findById(decoded.userId);
            if (!curentUser) {
                return next(new ApiError("The user doesnot exit", 401));
            }
            req.user = curentUser;
            next();
        } catch (error) {
            // Token verification failed
            console.error("JWT Error:", error.message);
            if (error.name === "TokenExpiredError") {
                return next(new ApiError("Token has expired", 401));
            } else {
                console.error("JWT Error:", error.message);
                return next(new ApiError("Not login", 401));
            }
        }
    }
});

//Permissions
//Verify user permissions
exports.allowedTo = (role) =>
    asyncHandler(async (req, res, next) => {
        const id = req.user._id;
        const dbName = req.query.databaseName;
        try {
            const db = mongoose.connection.useDb(dbName);

            const employeeModel = db.model("Employee", emoloyeeShcema);
            const rolesModel = db.model("Roles", rolesShcema);

            //get all user's roles
            const employee = await employeeModel.findById(id).populate({ path: "selectedRoles", select: "name _id" });
            if (!employee) {
                return next(new ApiError(`No employee by this id ${id}`, 404));
            }

            //4-get all roles
            const roles = await rolesModel.findById(employee.selectedRoles[0]);

            if (!roles) {
                return next(new ApiError("Roles not found for the user", 404));
            }

            const { rolesDashboard, rolesPos } = roles;
            const [dashRoleName, poseRoleName] = await Promise.all([getDashboardRoles(rolesDashboard, db), getPosRoles(rolesPos, db)]);

            let allUserRoles = [...dashRoleName, ...poseRoleName];

            if (!allUserRoles.includes(role)) {
                return next(new ApiError("Block access", 403));
            }
            next();
        } catch (error) {
            return next(error);
        }
    });