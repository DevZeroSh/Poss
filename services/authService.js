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
const customarSchema = require("../models/customarModel");
const sendEmail = require("../utils/sendEmail");

// @desc      Login
// @route     POST /api/auth/login
// @access    Public
exports.login = asyncHandler(async (req, res, next) => {
  //here search for employee using this connection
  try {
    const dbName = req.query.databaseName;

    // const subscribtionId = req.query.subscribtionId;
    const db = mongoose.connection.useDb(dbName);

    const employeeModel = db.model("Employee", emoloyeeShcema);
    const rolesModel = db.model("Roles", rolesShcema);

    //const companyPool = await req.companyPool;

    const user = await employeeModel.findOne({ email: req.body.email });
    if (!user) {
      return next(new ApiError("Incorrect email", 401));
    }
    //Check if the password is correct
    const passwordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
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
      const curentUser = await employeeModel.findById(decoded.userId);
      if (!curentUser) {
        return next(new ApiError("The user does not exit", 404));
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

// @desc      Forgot password
// @route     POST /api/auth/forgotpasswordpos
// @access    Public
exports.forgotPasswordPos = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const employeeModel = db.model("Employee", emoloyeeShcema);

  // 1) Get user by email
  const { email } = req.body;
  const user = await employeeModel.findOne({ email });
  if (!user) {
    return next(
      new ApiError(`There is no user with this email address ${email}`, 404)
    );
  }

  // 2) Generate random reset code and save it in db
  const resetCode = Math.floor(Math.random() * 1000000 + 1).toString();
  // Encrypt the reset code before saving it in db (Security)
  const hashedResetCode = await bcrypt.hash(resetCode, 10);

  user.passwordResetCode = hashedResetCode;
  //10 min
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  user.resetCodeVerified = false;
  await user.save();

  // 3) Send password reset code via email
  const message = `Forgot your password? Submit this reset password code: ${resetCode}\n If you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Code (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "Success",
      message: "Reset code sent to your email",
    });
  } catch (err) {
    // If there's an error sending the email, clear the reset code and expiration time
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log(err);
    return next(
      new ApiError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});

// @desc      Verify reset password code
// @route     POST /api/auth/verifyresetcodepos
// @access    Public
exports.verifyPasswordResetCodePos = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const employeeModel = db.model("Employee", emoloyeeShcema);

  const { resetCode } = req.body;

  const user = await employeeModel.find({ passwordResetExpires: { $gt: Date.now() } })
  if (!user) {
    return next(new ApiError("Reset code is invalid or has expired", 400));
  }
  // 3) Compare the reset code with the hashed code stored in the database
  const isResetCodeValid = await bcrypt.compare(
    resetCode,
    user.passwordResetCode
  );
  console.log(resetCode)
  if (!isResetCodeValid) {
    return next(new ApiError("Reset code is invalid or has expired", 400));
  }
  // 4) Mark reset code as verified
  user.resetCodeVerified = true;
  await user.save();

  res.status(200).json({
    status: "Success",
  });

})

// @desc      Reset password
// @route     POST /api/auth/resetpasswordpos
// @access    Public
exports.resetPasswordPos = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const employeeModel = db.model("Employee", emoloyeeShcema);
  // 1) Get user based on email
  const user = await employeeModel.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new ApiError(
        `There is no user with this email address ${req.body.email}`,
        404
      )
    );
  }
  // Check if user verify the reset code
  if (!user.resetCodeVerified) {
    return next(new ApiError("reset code not verified", 400));
  }
  const hashedResetCode = await bcrypt.hash(req.body.newPassword, 10);

  // 2) Update user password & Hide passwordResetCode & passwordResetExpires from the result
  user.password = hashedResetCode;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.resetCodeVerified = undefined;
  await user.save();

  // 3) If everything ok, send token to client
  const token = createToken(user._id);

  res.status(200).json({ user: user, token });
});

// @desc      Signup
// @route     POST /api/auth/signup
// @access    Public
exports.signup = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);
  const hashedResetCode = await bcrypt.hash(req.body.password, 10);
  const user = await customersModel.create({
    name: req.body.name,
    slug: req.body.slug,
    email: req.body.email,
    phone: req.body.phone,
    password: hashedResetCode,
    customarType: "ecommerce",
  });

  const token = createToken(user._id);

  res.status(201).json({ data: user, token });
});

// @desc    Login
// @route   GET /api/v1/auth/login
// @access  Public
exports.EcommerceLogin = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);

  const user = await customersModel.findOne({ email: req.body.email });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new ApiError("Incorrect email or password", 401));
  }
  // 3) generate token
  const token = createToken(user._id);
  // console.log(token)
  // Delete password from response
  delete user._doc.password;
  // 4) send response to client side
  res.status(200).json({ data: user, token });
});

// @desc   make sure the user is logged in
exports.ecommerceProtect = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;

  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);

  // 1) Check if token exist, if exist get
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new ApiError(
        "You are not login, Please login to get access this route",
        401
      )
    );
  }

  // 2) Verify token (no change happens, expired token)
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // 3) Check if user exists
  const currentUser = await customersModel.findById(decoded.userId);
  if (!currentUser) {
    return next(
      new ApiError(
        "The user that belong to this token does no longer exist",
        401
      )
    );
  }

  // 4) Check if user change his password after token created
  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    // Password changed after token created (Error)
    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "User recently changed his password. please login again..",
          401
        )
      );
    }
  }

  req.user = currentUser;
  next();
});

// @desc      Forgot password
// @route     POST /api/auth/forgotPassword
// @access    Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);

  // 1) Get user by email
  const { email } = req.body;
  const user = await customersModel.findOne({ email });
  if (!user) {
    return next(
      new ApiError(`There is no user with this email address ${email}`, 404)
    );
  }

  // 2) Generate random reset code and save it in db
  const resetCode = Math.floor(Math.random() * 1000000 + 1).toString();
  // Encrypt the reset code before saving it in db (Security)
  const hashedResetCode = await bcrypt.hash(resetCode, 10);

  user.passwordResetCode = hashedResetCode;
  //10 min
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  user.resetCodeVerified = false;
  await user.save();

  // 3) Send password reset code via email
  const message = `Forgot your password? Submit this reset password code: ${resetCode}\n If you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Code (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "Success",
      message: "Reset code sent to your email",
    });
  } catch (err) {
    // If there's an error sending the email, clear the reset code and expiration time
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log(err);
    return next(
      new ApiError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});

// @desc      Verify reset password code
// @route     POST /api/auth/verifyResetCode
// @access    Public
exports.verifyPasswordResetCode = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);

  // 1) Get user based on reset code
  const { resetCode } = req.body; // Assuming resetCode is a string

  // 2) Get user from database
  const user = await customersModel.findOne({
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ApiError("Reset code is invalid or has expired", 400));
  }

  // 3) Compare the reset code with the hashed code stored in the database
  const isResetCodeValid = await bcrypt.compare(
    resetCode,
    user.passwordResetCode
  );

  if (!isResetCodeValid) {
    return next(new ApiError("Reset code is invalid or has expired", 400));
  }

  // 4) Mark reset code as verified
  user.resetCodeVerified = true;
  await user.save();

  res.status(200).json({
    status: "Success",
  });
});

// @desc      Reset password
// @route     POST /api/auth/resetPassword
// @access    Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);
  // 1) Get user based on email
  const user = await customersModel.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new ApiError(
        `There is no user with this email address ${req.body.email}`,
        404
      )
    );
  }
  // Check if user verify the reset code
  if (!user.resetCodeVerified) {
    return next(new ApiError("reset code not verified", 400));
  }
  const hashedResetCode = await bcrypt.hash(req.body.newPassword, 10);

  // 2) Update user password & Hide passwordResetCode & passwordResetExpires from the result
  user.password = hashedResetCode;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.resetCodeVerified = undefined;
  await user.save();

  // 3) If everything ok, send token to client
  const token = createToken(user._id);

  res.status(200).json({ user: user, token });
});

//Permissions
//Verify user permissions
// exports.allowedTo = (role) =>
//     asyncHandler(async (req, res, next) => {
//         const id = req.user._id;
//         const dbName = req.query.databaseName;
//         try {
//             const db = mongoose.connection.useDb(dbName);

//             const employeeModel = db.model("Employee", emoloyeeShcema);
//             const rolesModel = db.model("Roles", rolesShcema);

//             //get all user's roles
//             const employee = await employeeModel
//                 .findById(id)
//                 .populate({ path: "selectedRoles", select: "name _id" });
//             if (!employee) {
//                 return next(new ApiError(`No employee by this id ${id}`, 404));
//             }

//             //4-get all roles
//             const roles = await rolesModel.findById(employee.selectedRoles[0]);

//             if (!roles) {
//                 return next(new ApiError("Roles not found for the user", 404));
//             }

//             const { rolesDashboard, rolesPos } = roles;
//             const [dashRoleName, poseRoleName] = await Promise.all([
//                 getDashboardRoles(rolesDashboard, db),
//                 getPosRoles(rolesPos, db),
//             ]);

//             let allUserRoles = [...dashRoleName, ...poseRoleName];

//             // Use the some method to check if any role in allUserRoles is included in the provided role array
//             if (!allUserRoles.some(userRole => role.includes(userRole))) {
//                 return next(new ApiError("Block access", 403));
//             }
//             next();
//         } catch (error) {
//             return next(error);
//         }
//     });
