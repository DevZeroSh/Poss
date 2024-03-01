const express = require("express");
const {
  getProduct,
  createProduct,
  getOneProduct,
  updateProduct,
  uploadProductImage,
  resizerImage,
  addProduct,
  deActiveProductQuantity,
  archiveProduct,
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

productRout.use(authService.protect);
productRout.post("/add", uploads.single("file"), addProduct);

productRout
  .route("/")
  .get(authService.protect, getProduct)
  .post(authService.protect, uploadProductImage, resizerImage, createProduct);

productRout
  .route("/deactive/:id")
  .put(authService.protect, deActiveProductQuantity);

productRout
  .route("/:id")
  .get(authService.protect, getProdictValidator, getOneProduct)
  .put(
    authService.protect,
    uploadProductImage,
    resizerImage,
    updateProductValidator,
    updateProduct
  )
  .delete(authService.protect, deleteProductValdiator, archiveProduct);

module.exports = productRout;
