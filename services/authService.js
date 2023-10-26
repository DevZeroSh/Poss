const asyncHandler = require("express-async-handler");
const Employee = require("../models/employeeModel");
const RoleModel = require("../models/roleModel");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const { getDashboardRoles } = require("./roleDashboardServices");
const { getPosRoles } = require("./rolePosServices");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const employeeModel = require("../models/employeeModel");

exports.login = asyncHandler(async (req, res, next) => {
    try {
        const user = await Employee.findOne({ email: req.body.email });
        if (!user) {
            return next(new ApiError("Incorrect email", 401));
        }

        // 3. Check if the password is correct
        const passwordMatch = await bcrypt.compare(
            req.body.password,
            user.password
        );
        if (!passwordMatch) {
            return next(new ApiError("Incorrect Password", 401));
        }
        // 4. Check if the user is active
        if (user.archives === "true") {
            return next(new ApiError("The account is not active", 401));
        }

        // 5. Remove the password and pin from the user object
        // Set sensitive fields to `undefined`
        user.password = undefined;
        user.pin = undefined;

        // Fetch role information
        const roles = await RoleModel.findById(user.selectedRoles[0]);
        const { rolesDashboard, rolesPos } = roles;

        // Fetch role names
        const dashRoleName = await getDashboardRoles(rolesDashboard);
        const posRoleName = await getPosRoles(rolesPos);
        // 8. Generate a JWT token
        const token = createToken(user._id);

        res.status(200).json({
            status: "true",
            data: user,
            dashBoardRoles: dashRoleName,
            posRolesName: posRoleName,
            token,
        });
    } catch (error) {
        next(error);
    }
});

// @desc   make sure the user is logged in sys
exports.protect = asyncHandler(async (req, res, next) => {
    //1-Check if token exist, if exist get
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(new ApiError("Not login", 401));
    } else {
        try {
            //2- Verify token (no change happens, expired token)
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            //3-Check if user exists
            const curentUser = await Employee.findById(decoded.userId);
            if (!curentUser) {
                return next(new ApiError("The user doesnot exit", 401));
            }
            req.user = curentUser;
            next();
        } catch (error) {
            // Token verification failed
            console.error("JWT Error:", error.message);
            return next(new ApiError("Not login", 401));
        }
    }
});

//Permissions
//Verify user permissions
exports.allowedTo = (role) =>
    asyncHandler(async (req, res, next) => {
        const id = req.user._id;
        try {
            //get all user's roles
            const employee = await employeeModel
                .findById(id)
                .populate({ path: "selectedRoles", select: "name _id" });
            if (!employee) {
                return next(new ApiError(`No employee by this id ${id}`, 404));
            }

            //4-get all roles
            const roles = await RoleModel.findById(employee.selectedRoles[0]);
            const { rolesDashboard, rolesPos } = roles;
            const [dashRoleName, poseRoleName] = await Promise.all([
                getDashboardRoles(rolesDashboard),
                getPosRoles(rolesPos),
            ]);

            let allUserRoles = [...dashRoleName, ...poseRoleName];

            if (!allUserRoles.includes(role)) {
                return next(new ApiError("Block access", 403));
            }
            next();
        } catch (error) {
            return next(error);
        }
    });
