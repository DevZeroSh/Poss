const express = require("express");
const { createCompanyInfo, uploadCompanyLogo, resizerLogo, getCompanyInfo, updataCompanyInfo } = require("../services/companyInfoService");

const authService = require("../services/authService");

const companyInfoRoute = express.Router();

companyInfoRoute.route("/").post(uploadCompanyLogo, resizerLogo, createCompanyInfo).get(authService.protect, getCompanyInfo);
companyInfoRoute.route("/:id").put(authService.protect, authService.allowedTo("company info"), uploadCompanyLogo, resizerLogo, updataCompanyInfo);

module.exports = companyInfoRoute;
