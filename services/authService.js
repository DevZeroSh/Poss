const asyncHandler = require("express-async-handler");
const Employee = require("../models/employeeModel");
const RoleModel = require("../models/roleModel");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const { getDashboardRoles } = require("./roleDashboardServices");
const { getPosRoles } = require("./rolePosServices");
const jwt = require("jsonwebtoken");

exports.login = asyncHandler(async (req, res, next) => {
    const user = await Employee.findOne({ email: req.body.email });

    if (!user) {
        return next(new ApiError("Incorrect email", 401));
    } else if (user.password != req.body.password) {
        return next(new ApiError("Incorrect Password", 401));
    } else if (user.archives == "true") {
        return next(new ApiError("The account is not active", 401));
    } else {
        //3-generate JWT
        const token = createToken(user._id);

        //4-get all roles
        const roles = await RoleModel.findById(user.selectedRoles[0]);

        const dashboardRolesIds = roles.rolesDashboard;
        const posRolesIds = roles.rolesPos;

        const dashRoleName = await getDashboardRoles(dashboardRolesIds);
        const poseRoleName = await getPosRoles(posRolesIds);

        //5-send response to client side
        res.status(200).json({
            status: "true",
            data: user,
            dashBoardRoles: dashRoleName,
            posRolesName: poseRoleName,
            token,
        });
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
    }

    //2- Verify token (no change happens, expired token)
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    //3-Check if user exists
    const curentUser = await Employee.findById(decoded.userId);
    if (!curentUser) {
        return next(new ApiError("The user doesnot exit", 401));
    }

    //4-Check if user change his password after token created
    // if (curentUser.passwordChangedAt) {
    //     const passwordChangedTimestamp = parseInt(
    //         curentUser.passwordChangedAt.getTime() / 1000,
    //         10
    //     );

    //     //Password changed after token created (Error)
    //     if (passwordChangedTimestamp > decoded.iat) {
    //         return next(
    //             new ApiError(
    //                 "User recently changed his password. Please login again..",
    //                 401
    //             )
    //         );
    //     }
    // }
    req.user = curentUser;
    next();
});
