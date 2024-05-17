const asyncHandler = require("express-async-handler");
const { default: mongoose } = require("mongoose");
const footerSchema = require("../../models/ecommerce/footerModel");
const ApiError = require("../../utils/apiError");

exports.addFooters = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const footerModel = db.model("footer", footerSchema);
  const footer = await footerModel.create(req.body);

  res.status(200).json({
    status: "success",
    message: "Inserted",
    data: footer,
  });
});

exports.getFooters = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const footerModel = db.model("footer", footerSchema);
  const footer = await footerModel.find();
  res.status(200).json({
    status: "success",
    results: footer.length,
    data: footer,
  });
});

exports.getFooter = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const footerModel = db.model("footer", footerSchema);
  const { id } = req.params;
  const footer = await footerModel.findById(id);
  if (!footer) {
    return next(new ApiError(`Not fund footer as this Id ${id}`));
  }
  res.status(200).json({
    status: "success",
    data: footer,
  });
});

exports.updateFooter = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const footerModel = db.model("footer", footerSchema);
  const { id } = req.params;
  const footer = await footerModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!footer) {
    return next(new ApiError(`Not fond for this id ${id}`));
  }
  res.status(200).json({
    status: "success",
    message: "updated",
    data: footer,
  });
});

exports.deleteFooter = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const footerModel = db.model("footer", footerSchema);
  const { id } = req.params;
  const footer = await footerModel.findOneAndDelete(id);
  if (!footer) {
    return next(new ApiError(`Not fond for this id ${id}`));
  }
  res.status(200).json({
    status: "success",
    message: "footer has been deleted",
  });
});
