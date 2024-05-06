const express = require("express");
const authService = require("../../services/authService");
const {
  createkvkk,
  getKvkk,
  createPrivacyPolicy,
  getPrivacyPolicy,
  createTermsOfUse,
  getTermsOfUse,
} = require("../../services/ecommerce/pageService");

const pagesRout = express.Router();

pagesRout.route("/kvkk").post(createkvkk).get(getKvkk);
pagesRout
  .route("/privacyPolicy")
  .post(createPrivacyPolicy)
  .get(getPrivacyPolicy);
pagesRout.route("/termsofuse").post(createTermsOfUse).get(getTermsOfUse);

module.exports = pagesRout;
