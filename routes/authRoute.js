const express = require("express");

const { login } = require("../services/authService");
const { checkUserSubsicreber } = require("../middlewares/checkUserSubsicreber");


const router = express.Router();

router.use(checkUserSubsicreber);

router.post("/login", login);

module.exports = router;
