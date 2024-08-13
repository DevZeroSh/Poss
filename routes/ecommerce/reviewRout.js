const express = require("express");

const {
  getReviews,
  createReview,
  getOneReview,
  updateReview,
  deleteReview,
  getReviewsByProduct,
} = require("../../services/ecommerce/reviewService");

const reviewRout = express.Router();

reviewRout.route("/").get(getReviews).post(createReview);
reviewRout.route("/reviewproduct/:id").get(getReviewsByProduct);
reviewRout
  .route("/:id")
  .get(getOneReview)
  .put(updateReview)
  .delete(deleteReview);

module.exports = reviewRout;
