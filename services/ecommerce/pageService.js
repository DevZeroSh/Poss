const asyncHandler = require("express-async-handler");
const { kvkkSchema, privacyPolicySchema, termsOfUseSchema } = require("../../models/ecommerce/pageModel");
const { default: mongoose } = require("mongoose");

exports.createkvkk = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const kvkkModel = db.model("kvkk", kvkkSchema);
  const kvkk = await kvkkModel.create(req.body);

  res.status(200).json({
    status: "true",
    message: "kvkk Inserted",
    data: kvkk,
  });
});

exports.getKvkk = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const kvkkModel = db.model("kvkk", kvkkSchema);
  const kvkk = await kvkkModel.find();

  res.status(200).json({
    status: "true",

    data: kvkk,
  });
});

exports.createPrivacyPolicy = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
  
    const privacyPolicyModel = db.model("privacyPolicy", privacyPolicySchema);
    const privacyPolicy = await privacyPolicyModel.create(req.body);
  
    res.status(200).json({
      status: "true",
      message: "privacyPolicy Inserted",
      data: privacyPolicy,
    });
  });
  
  exports.getPrivacyPolicy = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
  
    const privacyPolicyModel = db.model("privacyPolicy", privacyPolicySchema);
    const privacyPolicy = await privacyPolicyModel.find();
  
    res.status(200).json({
      status: "true",
  
      data: privacyPolicy,
    });
  });

  exports.createTermsOfUse= asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
  
    const termsOfUseModel = db.model("termsOfUse", termsOfUseSchema);
    const termsOfUse = await termsOfUseModel.create(req.body);
  
    res.status(200).json({
      status: "true",
      message: "termsOfUse Inserted",
      data: termsOfUse,
    });
  });
  
  exports.getTermsOfUse = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
  
    const termsOfUseModel = db.model("termsOfUse", termsOfUseSchema);
    const termsOfUse = await termsOfUseModel.find();
  
    res.status(200).json({
      status: "true",
  
      data: termsOfUse,
    });
  });
