const express = require("express");
const {
  getProduct,
  createProduct,
  getOneProduct,
  deleteProduct,
  updateProduct,
  uploadProductImage,
  resizerImage,
} = require("../services/productServices");
const {
  craeteProductValidator,
  getProdictValidator,
  updateProductValidator,
  deleteProductValdiator,
} = require("../utils/validators/productValidator");

const productRout = express.Router();

productRout.route("/").get(getProduct).post(
  uploadProductImage,
  resizerImage,

  createProduct
);

productRout
  .route("/:id")
  .get(getProdictValidator, getOneProduct)
  .put(uploadProductImage, resizerImage, updateProductValidator, updateProduct)
  .delete(deleteProductValdiator, deleteProduct);

module.exports = productRout;
