const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");
const LabelModel = require("../models/labelsModel");
//@desc Get list of labels
//@route GEt /api/labels
//@accsess public
exports.getLabels = asyncHandler(async (req, res, next) => {
  const Label = await LabelModel.find();
  res.status(200).json({ status: "true", results: Label.length, data: Label });
});
//@desc Create labels
//@route Post /api/labels
//@access Private
exports.createLabel = asyncHandler(async (req, res, next) => {
  req.body.slug = slugify(req.body.name);
  const Label = await LabelModel.create(req.body);
  res
    .status(200)
    .json({ status: "true", message: "Label Inserted", data: Label });
});
//@desc GEtspecific labels by id
//@route Get /api/labels/:id
//@access Public
exports.getLabel = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const Label = await LabelModel.findById(id);
  if (!Label) {
    return next(new ApiError(`No Label for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: Label });
});
// @desc Update specific labels
// @route Put /api/labels/:id
// @access Private
exports.updataLabel = asyncHandler(async (req, res, next) => {
  const Label = await LabelModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!Label) {
    return next(new ApiError(`No Label for this id ${req.params.id}`, 404));
  }
  res
    .status(200)
    .json({ status: "true", message: "Label updated", data: Label });
});
//@desc Delete specific labels
// @rout Delete /api/labels/:id
// @access priveta
exports.deleteLabel = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const Label = await LabelModel.findByIdAndDelete(id);
  if (!Label) {
    return next(new ApiError(`No Label for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Label Deleted" });
});
