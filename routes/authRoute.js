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
} = require("../services/authService");
const { checkUserSubsicreber } = require("../middlewares/checkUserSubsicreber");

const router = express.Router();

router.post("/login", upload.none(), checkUserSubsicreber, login);
router.post("/ecommerce-login", EcommerceLogin);
router.post("/signup", signup);

router.post("/forgotPasswords", forgotPassword);
router.post("/verifyResetCode", verifyPasswordResetCode);
router.put("/resetPassword", resetPassword);

module.exports = router;
