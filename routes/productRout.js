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
    exportProductData,
    exportData,
} = require("../services/productServices");
const {
    craeteProductValidator,
    getProdictValidator,
    updateProductValidator,
    deleteProductValdiator,
} = require("../utils/validators/productValidator");
``;
const multer = require("multer");

const storage = multer.memoryStorage(); // Use memory storage for simplicity

const uploads = multer({ storage: storage });

const authService = require("../services/authService");
const { createConnection } = require("../middlewares/switchConnectDb");

const productRout = express.Router();

productRout.post("/add", authService.protect, uploads.single("file"), addProduct);
productRout.post("/export", authService.protect, exportData);
productRout.post("/export-pdoduct", authService.protect, exportProductData);

productRout
    .route("/")
    .get(async (req, res, next) => {
        try {
            if (req.query.databaseName && req.query.databaseName !== "") {
                const companyDatabaseName = req.query.databaseName;
                await createConnection(companyDatabaseName);
                next();
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error setting user database" });
        }
    }, getProduct)
    .post(authService.protect, authService.allowedTo("product"), uploadProductImage, resizerImage, createProduct);

productRout
    .route("/:id")
    .get(authService.protect, getProdictValidator, getOneProduct)
    .put(authService.protect, authService.allowedTo("product"), uploadProductImage, resizerImage, updateProductValidator, updateProduct)
    .delete(authService.protect, authService.allowedTo("product"), deleteProductValdiator, deleteProduct);

module.exports = productRout;
