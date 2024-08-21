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
  updateEcommerceProducts,
  setEcommerceProductPublish,
  updateEcommerceProductDeActive,
  ecommerceActiveProudct,
  setEcommerceProductFeatured,
  setEcommerceProductSponsored,
  getEcommerceProductSponsored,
  getEcommerceProductFeatured,
  ecommerceDashboardStats,
} = require("../services/productServices");
const {
  deleteProductValdiator,
} = require("../utils/validators/productValidator");
``;
const multer = require("multer");

const storage = multer.memoryStorage();

const uploads = multer({ storage: storage });

const authService = require("../services/authService");

const productRout = express.Router();

productRout.post("/add", uploads.single("file"), addProduct);




productRout.route("/ecommercedashboardstats").get(ecommerceDashboardStats);
productRout
  .route("/")
  .get(getProduct)
  .post(authService.protect, uploadProductImage, resizerImage, createProduct);

productRout.route("/productLazy").get(getLezyProduct);
productRout.route("/productpos").get(getProductPos);

productRout
  .route("/ecommerceproductdeactive")
  .put(authService.protect, updateEcommerceProductDeActive);

productRout
  .route("/ecommersproduct")
  .put(authService.protect, updateEcommerceProducts);

productRout.route("/ecommerce-active-product").get(ecommerceActiveProudct);


productRout
  .route("/deactive/:id")
  .put(authService.protect, deActiveProductQuantity);

productRout
  .route("/publish")
  .put(authService.protect, setEcommerceProductPublish);

productRout
  .route("/featureProduct")
  .put(authService.protect, setEcommerceProductFeatured)
  .get(getEcommerceProductFeatured);

productRout
  .route("/sponsorProduct")
  .put(authService.protect, setEcommerceProductSponsored)
  .get(getEcommerceProductSponsored);

productRout
  .route("/:id")
  .get(getOneProduct)
  .put(authService.protect, uploadProductImage, resizerImage, updateProduct)
  .delete(authService.protect, deleteProductValdiator, archiveProduct);

module.exports = productRout;
