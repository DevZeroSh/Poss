const express = require("express");
const multer = require("multer");

const upload = multer();
const {
  login,
  signup,
  forgotPassword,
  verifyPasswordResetCode,
  resetPassword,
  EcommerceLogin,
  forgotPasswordPos,
  resetPasswordPos,
  verifyPasswordResetCodePos,
  googleSignin,
  googleLogin,
} = require("../services/authService");
const { checkUserSubsicreber } = require("../middlewares/checkUserSubsicreber");

const router = express.Router();

router.post("/login", upload.none(), checkUserSubsicreber, login);
router.post(
  "/forgotpasswordspos",
  upload.none(),
  checkUserSubsicreber,
  forgotPasswordPos
);
router.post("/verifyresetcodepos", verifyPasswordResetCodePos);
router.put(
  "/resetpasswordpos",
  upload.none(),
  checkUserSubsicreber,
  resetPasswordPos
);

router.post("/ecommerce-login", EcommerceLogin);
router.post("/google-signin", googleLogin);
router.post("/signup", signup);
router.post("/forgotPasswords", forgotPassword);
router.post("/verifyResetCode", verifyPasswordResetCode);
router.put("/resetPassword", upload.none(), resetPassword);

module.exports = router;
