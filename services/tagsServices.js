const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");
const tagsSchema = require("../models/tagModel");

// @desc Get list of tags
// @route GET /api/tags
// @accsess public
exports.getTags = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const TagModel = db.model("Tags", tagsSchema);
  const Tag = await TagModel.find();
  res.status(200).json({ status: "true", results: Tag.length, data: Tag });
});

// @desc Create tag
// @route POST /api/tags
// @access Private
exports.createTag = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const TagModel = db.model("Tags", tagsSchema);

  req.body.slug = slugify(req.body.name);
  const Tag = await TagModel.create(req.body);
  res.status(200).json({ status: "true", message: "Tag inserted", data: Tag });
});

// @desc Get specific tag by ID
// @route GET /api/tags/:id
// @access Public
exports.getTag = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const TagModel = db.model("Tags", tagsSchema);
  const { id } = req.params;
  const Tag = await TagModel.findById(id);
  if (!Tag) {
    return next(new ApiError(`No Tag for this ID: ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: Tag });
});

// @desc Update specific tag
// @route PUT /api/tags/:id
// @access Private
exports.updateTag = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const TagModel = db.model("Tags", tagsSchema);
  const Tag = await TagModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!Tag) {
    return next(new ApiError(`No Tag for this ID ${req.params.id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Tag updated", data: Tag });
});

// @desc Delete specific tag
// @route DELETE /api/tags/:id
// @access Private
exports.deleteTag = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const TagModel = db.model("Tags", tagsSchema);
  const { id } = req.params;
  const Tag = await TagModel.findByIdAndDelete(id);
  if (!Tag) {
    return next(new ApiError(`No Tag for this ID ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Tag deleted" });
});
