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

const authService = require("../services/authService");
const productRout = express.Router();
productRout.use(authService.protect);

productRout.route("/")
  .get(getProduct)
  .post(authService.allowedTo("new product"),uploadProductImage,resizerImage,createProduct);

productRout.route("/:id")
  .get(getProdictValidator, getOneProduct)
  .put(uploadProductImage, resizerImage, updateProductValidator, updateProduct)
  .delete(authService.allowedTo("delete product"),deleteProductValdiator, deleteProduct);

module.exports = productRout;
