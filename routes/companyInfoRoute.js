const express = require("express");
const { createCompanyInfo, uploadCompanyLogo, resizerLogo, getCompanyInfo, updataCompanyInfo } = require("../services/companyInfoService");

const authService = require("../services/authService");

const companyInfoRoute = express.Router();

companyInfoRoute.use(authService.protect);
companyInfoRoute.route("/").post(authService.allowedTo("company info"), uploadCompanyLogo, resizerLogo, createCompanyInfo).get(getCompanyInfo);
companyInfoRoute.route("/:id").put(authService.allowedTo("company info"), uploadCompanyLogo, resizerLogo, updataCompanyInfo);

module.exports = companyInfoRoute;
