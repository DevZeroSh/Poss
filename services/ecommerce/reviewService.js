const { default: mongoose } = require("mongoose");
const reviewSchema = require("../../models/ecommerce/reviewModel");
const asyncHandler = require("express-async-handler");
const customarSchema = require("../../models/customarModel");

//@desc Get list of reviews
//@route GEt /api/review
//@accsess public
exports.getReviews = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const reviewModel = db.model("Review", reviewSchema);
  db.model("Customar", customarSchema);

  const review = await reviewModel.find();
  res
    .status(200)
    .json({ status: "success", results: review.length, data: review });
});

//@desc Get list of review
//@route GEt /api/review/:id
//@accsess public
exports.getOneReview = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const reviewModel = db.model("Review", reviewSchema);
  db.model("Customar", customarSchema);

  const { id } = req.params;
  const review = await reviewModel.findById(id);
  if (!id) {
    return next(new ApiError(`No Brand found for id ${id}`, 404));
  }
  res
    .status(200)
    .json({ status: "success", results: review.length, data: review });
});

//@desc Post list of review
//@route Post /api/review/:id
//@accsess public
exports.createReview = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const reviewModel = db.model("Review", reviewSchema);

  const review = await reviewModel.create(req.body);
  reviewModel.calcAverageRatingsAndQuantity(req.body.product, dbName);

  res
    .status(200)
    .json({ status: "success", results: review.length, data: review });
});

//@desc Put list of review
//@route Put /api/review/:id
//@accsess public
exports.updateReview = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const reviewModel = db.model("Review", reviewSchema);
  db.model("Customar", customarSchema);

  const review = await reviewModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!review) {
    return next(new ApiError(`No Brand found for id ${req.params.id}`, 404));
  }
  res
    .status(200)
    .json({ status: "success", results: review.length, data: review });
});

//@desc delete list of review
//@route delete /api/review/:id
//@accsess public
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const reviewModel = db.model("Review", reviewSchema);
  db.model("Customar", customarSchema);

  const { id } = req.params;

  const review = await reviewModel.findByIdAndDelete(id);
  if (!review) {
    return next(new ApiError(`No Brand found for id ${req.params.id}`, 404));
  }
  res.status(200).json({ status: "success", message: "review Deleted" });
});
