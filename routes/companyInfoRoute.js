const express = require("express");
const { createCompanyInfo, uploadCompanyLogo, resizerLogo, getCompanyInfo, updataCompanyInfo } = require("../services/companyInfoService");

const authService = require("../services/authService");
//const switchConnectDb = require("../middlewares/switchConnectDb");

const companyInfoRoute = express.Router();

//companyInfoRoute.use(switchConnectDb);
//companyInfoRoute.use(authService.protect);
companyInfoRoute.route("/").post(uploadCompanyLogo, resizerLogo, createCompanyInfo).get(getCompanyInfo);
companyInfoRoute.route("/:id").put(authService.allowedTo("company info"), uploadCompanyLogo, resizerLogo, updataCompanyInfo);

module.exports = companyInfoRoute;
