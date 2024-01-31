const express = require("express");
const {
  getProduct,
  createProduct,
  getOneProduct,
  deleteProduct,
  updateProduct,
  uploadProductImage,
  resizerImage,
  addProduct,
  deActiveProductQuantity,
} = require("../services/productServices");
const {
  getProdictValidator,
  updateProductValidator,
  deleteProductValdiator,
} = require("../utils/validators/productValidator");
``;
const multer = require("multer");

const storage = multer.memoryStorage(); // Use memory storage for simplicity

const uploads = multer({ storage: storage });

const authService = require("../services/authService");

const productRout = express.Router();

productRout.post("/add", uploads.single("file"), addProduct);

productRout
  .route("/")
  .get(getProduct)
  .post(
    authService.protect,
    authService.allowedTo("product"),
    uploadProductImage,
    resizerImage,
    createProduct
  );

productRout
  .route("/deactive/:id")
  .put(
    authService.protect,
    authService.allowedTo("product"),
    deActiveProductQuantity
  );

productRout
  .route("/:id")
  .get(authService.protect, getProdictValidator, getOneProduct)
  .put(
    authService.protect,
    authService.allowedTo("product"),
    uploadProductImage,
    resizerImage,
    updateProductValidator,
    updateProduct
  )
  .delete(
    authService.protect,
    authService.allowedTo("product"),
    deleteProductValdiator,
    deleteProduct
  );

module.exports = productRout;
