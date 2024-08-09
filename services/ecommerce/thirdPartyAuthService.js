const asyncHandler = require("express-async-handler");
const thirdPartyAuthSchema = require("../../models/ecommerce/thirdPartyAuthModel");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");

// Get list of third party auths
exports.getAuths = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  if (!dbName) {
    return next(new ApiError("Database name is required", 400));
  }

  const db = mongoose.connection.useDb(dbName);
  const thirdPartyModel = db.model("ThirdPartyAuth", thirdPartyAuthSchema);
  const thirdParties = await thirdPartyModel.find();

  res.status(200).json({
    status: "success",
    results: thirdParties.length,
    data: thirdParties,
  });
});

// Get specific third party auth by ID
exports.getThirdPartyAuth = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  if (!dbName) {
    return next(new ApiError("Database name is required", 400));
  }

  const db = mongoose.connection.useDb(dbName);
  const thirdPartyModel = db.model("ThirdPartyAuth", thirdPartyAuthSchema);

  const { id } = req.params;
  const thirdPartyAuth = await thirdPartyModel.findById(id);

  if (!thirdPartyAuth) {
    return next(new ApiError(`No third party auth found for id ${id}`, 404));
  }

  res.status(200).json({
    status: "success",
    data: thirdPartyAuth,
  });
});

// Update specific third party auth
exports.updateThirdPartyAuth = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  if (!dbName) {
    return next(new ApiError("Database name is required", 400));
  }

  const db = mongoose.connection.useDb(dbName);
  const thirdPartyModel = db.model("ThirdPartyAuth", thirdPartyAuthSchema);
  const { id } = req.params;

  const thirdPartyAuth = await thirdPartyModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!thirdPartyAuth) {
    return next(
      new ApiError(`No third party auth found for id ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    message: "Third party auth updated",
    data: thirdPartyAuth,
  });
});
