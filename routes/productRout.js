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
  getLezyProduct,
  getProductPos,
} = require("../services/productServices");
const {
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
  .post(authService.protect, uploadProductImage, resizerImage, createProduct);

productRout.route("/productLazy").get(getLezyProduct)
productRout.route("/productpos").get(getProductPos)

productRout
  .route("/deactive/:id")
  .put(authService.protect, deActiveProductQuantity);

productRout
  .route("/:id")
  .get(getOneProduct)
  .put(
    authService.protect,
    uploadProductImage,
    resizerImage,
    updateProduct
  )
  .delete(authService.protect, deleteProductValdiator, archiveProduct);

module.exports = productRout;
