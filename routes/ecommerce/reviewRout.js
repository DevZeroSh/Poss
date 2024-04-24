const express = require("express");

const {
  getReviews,
  createReview,
  getOneReview,
  updateReview,
  deleteReview,
} = require("../../services/ecommerce/reviewService");

const reviewRout = express.Router();

reviewRout.route("/").get(getReviews).post(createReview);
reviewRout
  .route("/:id")
  .get(getOneReview)
  .put(updateReview)
  .delete(deleteReview);

module.exports = reviewRout;
