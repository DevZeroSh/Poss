const asyncHandler = require("express-async-handler");
const { default: mongoose } = require("mongoose");
const pageSchema = require("../../models/ecommerce/pageModel");
const ApiError = require("../../utils/apiError");

exports.createPage = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const pageModel = db.model("page", pageSchema);
  const page = await pageModel.create(req.body);

  res.status(200).json({
    status: "true",
    message: "page Inserted",
    data: page,
  });
});

exports.getPage = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const pageModel = db.model("page", pageSchema);
  const page = await pageModel.find();

  res.status(200).json({
    status: "true",

    data: page,
  });
});

exports.getOnePage = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const pageModel = db.model("page", pageSchema);
  const { id } = req.params;
  const page = await pageModel.findById(id);

  if (!page) {
    return next(new ApiError(`There is no page with this id ${id}`, 404));
  }

  res.status(200).json({
    status: "true",
    data: page,
  });
});

exports.updatePage = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const pageModel = db.model("page", pageSchema);
  const { id } = req.params;

  const page = await pageModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  res.status(200).json({
    status: "true",

    data: page,
  });
});
