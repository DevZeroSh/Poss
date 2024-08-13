const { default: mongoose } = require("mongoose");
const reviewSchema = require("../../models/ecommerce/reviewModel");
const asyncHandler = require("express-async-handler");
const customarSchema = require("../../models/customarModel");
const productSchema = require("../../models/productModel");
const categorySchema = require("../../models/CategoryModel");
const brandSchema = require("../../models/brandModel");
const labelsSchema = require("../../models/labelsModel");
const TaxSchema = require("../../models/taxModel");
const UnitSchema = require("../../models/UnitsModel");
const variantSchema = require("../../models/variantsModel");
const currencySchema = require("../../models/currencyModel");
const E_user_Schema = require("../../models/ecommerce/E_user_Modal");
const ApiError = require("../../utils/apiError");

//@desc Get list of reviews
//@route GEt /api/review
//@accsess public
exports.getReviews = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const reviewModel = db.model("Review", reviewSchema);
  db.model("Users", E_user_Schema);
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
  db.model("Users", E_user_Schema);
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
  const Product = db.model("Product", productSchema);
  db.model("Users", E_user_Schema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  try {
    const review = await reviewModel.create(req.body);

    const [result] = await reviewModel.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(req.body.product) } },
      {
        $group: {
          _id: "$product",
          avgRatings: { $avg: "$rating" },
          ratingsQuantity: { $sum: 1 },
        },
      },
    ]);

    const updateData = result
      ? {
          ratingsAverage: result.avgRatings,
          ratingsQuantity: result.ratingsQuantity,
        }
      : { ratingsAverage: 0, ratingsQuantity: 0 };

    await Product.findByIdAndUpdate(req.body.product, updateData);

    res.status(200).json({ status: "success", data: review });
  } catch (error) {
    next(error);
  }
});

//@desc Put list of review
//@route Put /api/review/:id
//@accsess public
exports.updateReview = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const reviewModel = db.model("Review", reviewSchema);
  db.model("Users", E_user_Schema);
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
  db.model("Users", E_user_Schema);
  const { id } = req.params;

  const review = await reviewModel.findByIdAndDelete(id);
  if (!review) {
    return next(new ApiError(`No Brand found for id ${req.params.id}`, 404));
  }
  res.status(200).json({ status: "success", message: "review Deleted" });
});

exports.getReviewsByProduct = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const reviewModel = db.model("Review", reviewSchema);
  db.model("Users", E_user_Schema);

  const limit = parseInt(req.query.limit) || 20;
  const skip = parseInt(req.query.skip) || 0;
  const { id } = req.params;

  // Fetch the total number of reviews for this product
  const totalItems = await reviewModel.countDocuments({ product: id });

  // Calculate the total number of pages
  const totalPages = Math.ceil(totalItems / limit);

  // Fetch the reviews with pagination
  const reviews = await reviewModel
    .find({ product: id })
    .skip(skip)
    .limit(limit);

  if (!reviews || reviews.length === 0) {
    return next(ApiError(`No reviews found for product ID ${id}`, 404));
  }

  // Return the paginated results along with pagination info
  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: reviews,
    pagination: {
      currentPage: Math.floor(skip / limit) + 1,
      totalPages,
      totalItems,
      limit,
    },
  });
});
