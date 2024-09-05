const asyncHandler = require("express-async-handler");
const productSchema = require("../models/productModel");
const slugify = require("slugify");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const csvtojson = require("csvtojson");
const xlsx = require("xlsx");
const { default: mongoose } = require("mongoose");
const brandSchema = require("../models/brandModel");
const categorySchema = require("../models/CategoryModel");
const labelsSchema = require("../models/labelsModel");
const variantSchema = require("../models/variantsModel");
const UnitSchema = require("../models/UnitsModel");
const TaxSchema = require("../models/taxModel");
const currencySchema = require("../models/currencyModel");
const { createProductMovement } = require("../utils/productMovement");
const { createActiveProductsValue } = require("../utils/activeProductsValue");
const ProductMovementSchema = require("../models/productMovementModel");
const ActiveProductsValueModel = require("../models/activeProductsValueModel");
const reviewSchema = require("../models/ecommerce/reviewModel");
const getAllChildCategories = require("../utils/CategoriesChild");
const E_user_Schema = require("../models/ecommerce/E_user_Modal");
const ecommerceOrderSchema = require("../models/ecommerce/ecommerceOrderModel");

// @desc Get list product
// @route Get /api/product
// @access Public
exports.getProduct = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const productModel = db.model("Product", productSchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  db.model("Review", reviewSchema);
  db.model("Users", E_user_Schema);
  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = {};

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  if (req.query.type === "category" || req.query.type === "brand") {
    query.$and = [];
    if (req.query.type === "category") {
      query.$and.push({ category: req.query.id });
    }
    if (req.query.type === "brand") {
      query.$and.push({ brand: req.query.id });
    }
  }

  if (req.query.label) {
    query.label = req.query.label;
  }

  let sortQuery = {};
  if (req.query.sold) {
    sortQuery = { sold: parseInt(req.query.sold) === 1 ? 1 : -1 };
  } else {
    sortQuery = { createdAt: -1 };
  }

  const totalItems = await productModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);

  const product = await productModel
    .find(query)
    .sort(sortQuery)
    .skip(skip)
    .limit(pageSize)
    .populate({ path: "category" })
    .lean()
    .populate({ path: "brand", select: "name _id" })
    .populate({ path: "variant", select: "variant  _id" })
    .populate({ path: "unit", select: "name code  _id" })
    .populate({ path: "tax", select: "tax  _id" })
    .populate({ path: "label", select: "name  _id" })
    .populate({
      path: "currency",
      select: "currencyCode currencyName exchangeRate is_primary  _id",
    });

  const notices = product
    .filter((item) => item.alarm >= item.quantity && item.archives !== "true")
    .map((item) => ({
      qr: item.qr,
      name: item.name,
      id: item._id,
      message: `${item.qr} is low on stock.`,
    }));

  res.status(200).json({
    status: "true",
    results: product.length,
    Pages: totalPages,
    data: product,
    notices,
  });
});

exports.getProductPos = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName, { useCache: true });

  const productModel = db.model("Product", productSchema);
  const currencyModel = db.model("Currency", currencySchema);
  db.model("Tax", TaxSchema);

  const pageSize = parseInt(req.query.limit, 10) || 25;
  const page = parseInt(req.query.page, 10) || 1;
  const skip = (page - 1) * pageSize;

  let query = {};

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const stockId = req.query.stockId;

  if (!stockId) {
    return res
      .status(400)
      .json({ status: "false", message: "Stock ID is required" });
  }

  query["stocks.stockId"] = stockId;

  if (req.query.label) {
    query.label = req.query.label;
  }

  let sortQuery = req.query.sold
    ? { sold: parseInt(req.query.sold, 10) === 1 ? 1 : -1 }
    : { createdAt: -1 };

  const [totalItems, products] = await Promise.all([
    productModel.countDocuments(query),
    productModel
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(pageSize)
      .populate({ path: "currency", model: currencyModel })
      .populate({ path: "tax", select: "tax  _id" }),
  ]);

  const productsWithQuantity = products.map((product) => {
    const productObject = product.toObject();
    const stockEntry = product.stocks.find(
      (stock) => stock.stockId.toString() === stockId
    );
    productObject.activeCount = stockEntry ? stockEntry.productQuantity : 0;
    return productObject;
  });

  const totalPages = Math.ceil(totalItems / pageSize);
  res.status(200).json({
    status: "true",
    results: productsWithQuantity.length,
    pages: totalPages,
    data: productsWithQuantity,
  });
});

const multerOptions = () => {
  const multerStorage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new ApiError("Only images Allowed", 400), false);
    }
  };

  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

  return upload;
};

const uploadMixOfImages = (arrayOfFilelds) =>
  multerOptions().fields(arrayOfFilelds);

exports.uploadProductImage = uploadMixOfImages([
  { name: "image", maxCount: 1 },
  { name: "imageCover", maxCount: 1 },
  { name: "imagesArray", maxCount: 5 },
]);

exports.resizerImage = asyncHandler(async (req, res, next) => {
  if (req.files.image) {
    const imageCoverFilename = `product-${uuidv4()}-${Date.now()}-cover.png`;

    await sharp(req.files.image[0].buffer)
      .toFormat("png")
      .png({ quality: 70 })
      .toFile(`uploads/product/${imageCoverFilename}`);

    //save image into our db
    req.body.image = imageCoverFilename;
  }
  if (req.files.imageCover) {
    const imageECoverFilename = `product-${uuidv4()}-${Date.now()}-cover.png`;

    await sharp(req.files.imageCover[0].buffer)
      .toFormat("png")
      .png({ quality: 70 })
      .toFile(`uploads/product/${imageECoverFilename}`);

    //save image into our db
    req.body.imageCover = imageECoverFilename;
  }
  let coverImageName = null;
  //-2 Images
  if (req.files.imagesArray) {
    req.body.imagesArray = [];
    console.log(req.body);

    // Initialize a variable to store the cover image
    let coverImageName = null;

    // Process the images
    await Promise.all(
      req.files.imagesArray.map(async (img, index) => {
        const imageName = `product-${uuidv4()}-${Date.now()}-${index + 1}.png`;

        await sharp(img.buffer)
          .toFormat("png")
          .png({ quality: 70 })
          .toFile(`uploads/product/${imageName}`);

        // Check if this image should be the cover image
        if (index === 0) {
          coverImageName = imageName; // Set the first image as the cover
        } else {
          // Save other images into the imagesArray
          req.body.imagesArray.push({
            image: imageName,
            isCover: false,
          });
        }
      })
    );

    // If there's a cover image, add it to the imagesArray
    if (coverImageName) {
      req.body.imagesArray.unshift({
        image: coverImageName,
        isCover: true, // Mark this image as the cover
      });
    }
  }
  next();
});

// @desc get Product for Ecommerces
// @route Post /api/productLazy
// @access public
exports.getLezyProduct = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const productModel = db.model("Product", productSchema);
  db.model("Category", categorySchema);
  db.model("Brand", brandSchema);
  db.model("Variant", variantSchema);
  db.model("Tax", TaxSchema);

  const limit = parseInt(req.query.limit) || 16;
  const skip = parseInt(req.query.skip) || 0;
  let query = {
    publish: true,
    ecommerceActive: true,
  };

  // Keyword search
  if (req.query.keyword) {
    query.name = { $regex: req.query.keyword, $options: "i" };
  }

  // Type filtering for category or brand
  if (req.query.type === "category" && req.query.id) {
    try {
      query.category = new mongoose.Types.ObjectId(req.query.id);
    } catch (error) {
      return next(new Error("Invalid category ID format"));
    }
  }
  if (req.query.type === "brand" && req.query.id) {
    try {
      query.brand = new mongoose.Types.ObjectId(req.query.id);
    } catch (error) {
      return next(new Error("Invalid brand ID format"));
    }
  }
  if (req.query.brandId) {
    let brandIds;
    if (Array.isArray(req.query.brandId)) {
      brandIds = req.query.brandId.map((id) => new mongoose.Types.ObjectId(id));
    } else if (typeof req.query.brandId === "string") {
      brandIds = req.query.brandId
        .split(",")
        .map((id) => new mongoose.Types.ObjectId(id));
    } else {
      return next(new Error("Invalid brand ID format"));
    }
    query.brand = { $in: brandIds };
  }
  if (req.query.minAvg || req.query.maxAvg) {
    query.ratingsAverage = {};

    if (req.query.minAvg) {
      query.ratingsAverage.$gte = parseFloat(req.query.minAvg);
    }

    if (req.query.maxAvg) {
      query.ratingsAverage.$lte = parseFloat(req.query.maxAvg);
    }
  }

  // Sorting logic
  let sortQuery = { createdAt: -1 };
  if (req.query.sold) {
    sortQuery = { sold: parseInt(req.query.sold) === 1 ? 1 : -1 };
  }
  if (req.query.taxPrice) {
    sortQuery = {
      $cond: {
        if: { $gt: ["$ecommercePriceAftereDiscount", 0] },
        then: {
          ecommercePriceAftereDiscount: req.query.taxPrice === "asc" ? 1 : -1,
        },
        else: { effectivePrice: req.query.taxPrice === "asc" ? 1 : -1 },
      },
    };
  }
  if (req.query.ratingsAverage) {
    sortQuery = {
      ratingsAverage: parseInt(req.query.ratingsAverage) === 1 ? 1 : -1,
    };
  }
  if (req.query.addToFavourites) {
    sortQuery = {
      addToFavourites: parseInt(req.query.addToFavourites) === 1 ? 1 : -1,
    };
  }

  try {
    const aggregationPipeline = [
      // Add a temporary field to determine which price to use
      {
        $addFields: {
          effectivePrice: {
            $cond: {
              if: { $gt: ["$ecommercePriceAftereDiscount", 0] },
              then: "$ecommercePriceAftereDiscount",
              else: "$ecommercePrice",
            },
          },
        },
      },
      // Match query with conditional price filtering
      {
        $match: {
          ...query,
          ...((req.query.taxPriceMin || req.query.taxPriceMax) && {
            effectivePrice: {
              ...(req.query.taxPriceMin && {
                $gte: parseFloat(req.query.taxPriceMin),
              }),
              ...(req.query.taxPriceMax && {
                $lte: parseFloat(req.query.taxPriceMax),
              }),
            },
          }),
        },
      },
      { $sort: sortQuery },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $lookup: {
          from: "categories",
          localField: "category.children",
          foreignField: "_id",
          as: "category.childrenDetails",
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $lookup: {
          from: "variants",
          localField: "variant",
          foreignField: "_id",
          as: "variant",
        },
      },
      {
        $lookup: {
          from: "taxes",
          localField: "tax",
          foreignField: "_id",
          as: "tax",
        },
      },
    ];

    const products = await productModel.aggregate(aggregationPipeline);

    const totalItems = await productModel.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const setImageURL = (doc) => {
      if (doc.image) {
        doc.image = `${process.env.BASE_URL}/product/${doc.image}`;
      }
      if (doc.imagesArray) {
        doc.imagesArray = doc.imagesArray.map(
          (image) => `${process.env.BASE_URL}/product/${image}`
        );
      }
    };

    // Set image URLs for each product
    products.forEach(setImageURL);

    res.status(200).json({
      status: "true",
      results: products.length,
      Pages: totalPages,
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

// @desc update Stock product Quantity
const updateStocks = async (
  dbName,
  productId,
  stocks,
  quantity,
  productName
) => {
  try {
    // Connect to the appropriate database
    const db = mongoose.connection.useDb(dbName);

    // Update stock information for each stock provided
    for (const stockInfo of stocks) {
      const { stockId, stockName, productQuantity } = stockInfo;
      // Skip updating or adding the product if productQuantity is 0
      if (productQuantity === 0) {
        console.log(
          `Skipping product ${productId} in stock ${stockId} due to quantity 0`
        );
        continue;
      }
    }
  } catch (error) {
    throw new Error(`Error updating stocks: ${error.message}`);
  }
};

// @desc Create  product
const createProductHandler = async (dbName, productData) => {
  try {
    // Connect to the appropriate database
    const db = mongoose.connection.useDb(dbName);
    const currencyModel = db.model("Currency", currencySchema);

    const ActiveProductsValue = db.model(
      "ActiveProductsValue",
      ActiveProductsValueModel
    );
    // Define product model
    const productModel = db.model("Product", productSchema);

    // Create a slug for the product name
    productData.slug = slugify(productData.name);
    const product = await productModel.create(productData);
    if (productData.type !== "Service") {
      // Filter out stocks with productQuantity equal to 0
      productData.stocks = productData.stocks.filter(
        (stock) => stock.productQuantity > 0
      );
      productData.ecommercePrice = productData.taxPrice;
      productData.ecommercePriceBeforeTax = productData.price;
      // Create the product in the database

      const productValue = product.activeCount * product.buyingprice;
      const currency = await currencyModel.findById(product.currency);
      createActiveProductsValue(
        product.activeCount,
        productValue,
        currency._id,
        dbName
      )
        .then((savedData) => {})
        .catch((error) => {
          console.log(error);
        });
    }
    return product;
  } catch (error) {
    throw new Error(`Error creating product: ${error.message}`);
  }
};

// @desc Create  product
// @route Post /api/product
// @access Private
exports.createProduct = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const productData = req.body;

  try {
    // Create product
    const product = await createProductHandler(dbName, productData);

    // Update stocks with product ID

    await createProductMovement(
      product._id,
      product.quantity,
      product.quantity,
      "in",
      "create",
      dbName
    );
    // Respond with success message and data
    res.status(201).json({
      status: "true",
      message: "Product Inserted",
      data: product,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error creating product: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Get specific product by id
// @route Get /api/product/:id
// @access Private

exports.getOneProduct = asyncHandler(async (req, res, next) => {
  try {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);

    // Initialize only required models
    const productModel = db.model("Product", productSchema);
    const movementsModel = db.model("ProductMovements", ProductMovementSchema);
    db.model("Category", categorySchema);
    db.model("brand", brandSchema);
    db.model("Labels", labelsSchema);
    db.model("Tax", TaxSchema);
    db.model("Unit", UnitSchema);
    db.model("Variant", variantSchema);
    db.model("Currency", currencySchema);
    db.model("Review", reviewSchema);
    db.model("Users", E_user_Schema);

    const { id } = req.params;

    // Fetch product and movements concurrently
    const [product, movements] = await Promise.all([
      productModel
        .findById(id)
        .populate({ path: "alternateProducts" })
        .populate({ path: "category" })
        .populate({ path: "brand", select: "name _id" })
        .populate({ path: "variant", select: "variant _id" })
        .populate({ path: "unit", select: "name code _id" })
        .populate({ path: "tax", select: "tax _id" })
        .populate({ path: "label", select: "name _id" })
        .populate({ path: "currency" })
        .populate({ path: "review", options: { limit: 10 } }),

      movementsModel.find({ productId: id }),
    ]);

    // Check if product exists
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const setImageURL = (doc) => {
      if (doc.image) {
        const imageUrl = `${process.env.BASE_URL}/product/${doc.image}`;
        doc.image = imageUrl;
      }
      if (doc.imagesArray) {
        const imageList = doc.imagesArray.map((imageObj) => {
          return {
            image: `${process.env.BASE_URL}/product/${imageObj.image}`,
          };
        });
        doc.imagesArray = imageList;
        console.log(doc.imagesArray);
      }
    };

    setImageURL(product);
    res.status(200).json({ data: product, movements });
  } catch (error) {
    next(error);
  }
});

// @desc Update the product to go in Ecommers
// @route put /api/ecommersproduct
// @access private

exports.updateEcommerceProducts = async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);

  try {
    const productIds = req.body.productId;
    const categoryId = req.body.categoryId;
    const brandId = req.body.brandId;

    let updatedProducts;

    if (categoryId) {
      // Fetch all child categories for the given categoryId
      const allCategories = await getAllChildCategories(
        categoryId,
        db,
        categorySchema
      );

      // Update products by category
      updatedProducts = await productModel.updateMany(
        { category: { $in: allCategories } },
        { $set: { ecommerceActive: true } }
      );

      if (updatedProducts.matchedCount === 0) {
        console.log("No products found for the given category ID.");
      }
    } else if (brandId) {
      updatedProducts = await productModel.updateMany(
        { brand: { $in: brandId } },
        { $set: { ecommerceActive: true } }
      );
    } else {
      // Update products matching the given productIds
      updatedProducts = await Promise.all(
        productIds.map(async (productId) => {
          const product = await productModel.findByIdAndUpdate(
            productId,
            { ecommerceActive: true, importDate: new Date() },

            { new: true }
          );

          if (!product) {
            throw new Error(`Product with productId ${productId} not found.`);
          }

          return product;
        })
      );
    }

    res.status(200).json({ success: true, data: updatedProducts });
  } catch (error) {
    console.error("Error updating ecommerce products:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.updateEcommerceProductDeActive = asyncHandler(
  async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const productModel = db.model("Product", productSchema);

    try {
      const { productId } = req.body;

      // Log the request body for debugging
      console.log("Request body:", req.body);

      // Ensure productId is a string
      if (typeof productId !== "string") {
        return res.status(400).json({ error: "Invalid productId format" });
      }

      // Check if productId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: "Invalid productId" });
      }

      const updatedProduct = await productModel.findOneAndUpdate(
        { _id: productId },
        { ecommerceActive: false, publish: false },
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.status(200).json({ success: true, data: updatedProduct });
    } catch (error) {
      console.error("Error updating ecommerce products:", error.message);
      res.status(500).json({ error: "Server Error" });
    }
  }
);

// @desc Update the product to go in Ecommers
// @route put /api/ecommersproduct
// @access private
exports.setEcommerceProductPublish = async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);

  try {
    const id = req.body.id;
    const publish = req.body.publish;
    const product = await productModel.findById(id);
    console.log(product);
    if (product.ecommercePrice <= 0) {
      const updatedProduct = await productModel.findByIdAndUpdate(
        { _id: id },
        { publish: false }
      );
      return next(new ApiError("Please check the price of the product", 506));
    }
    // Await the findByIdAndUpdate operation
    const updatedProduct = await productModel.findByIdAndUpdate(
      { _id: id },
      { publish: publish },
      { new: true }
    );

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

// @desc Update specific product
// @route Put /api/product/:id
// @access Private
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);

  const productModel = db.model("Product", productSchema);

  const { id } = req.params;
  const productData = req.body;

  if (req.body.name) {
    req.body.slug = slugify(req.body.name);
  }
  try {
    const existingProduct = await productModel.findById({ _id: id });
    if (!existingProduct) {
      return next(new ApiError(`No Product for this id ${req.params.id}`, 404));
    }

    const quantityChanged = existingProduct.quantity != req.body.quantity;

    const product = await productModel.findByIdAndUpdate(
      { _id: id },
      req.body,
      {
        new: true,
      }
    );
    if (!product) {
      return next(new ApiError(`No Product for this id ${req.params.id}`, 404));
    }

    let savedMovement;
    if (quantityChanged) {
      savedMovement = await createProductMovement(
        id,
        req.body.quantity,
        req.body.quantity - req.body.quantityBefore,
        "edit",
        "update",
        dbName
      );
    }

    try {
      const quantityChanged = req.body.quantity !== req.body.quantityBefore;
      const priceChanged = req.body.buyingprice !== req.body.buyingpriceBefore;
      if (quantityChanged || priceChanged) {
        const ActiveProductsValue = db.model(
          "ActiveProductsValue",
          ActiveProductsValueModel
        );

        if (product.currency) {
          const existingRecord = await ActiveProductsValue.findOne({
            currency: req.body.currency,
          });

          // Calculate the total value for the new and old quantities and prices
          const newProductValue = req.body.quantity * req.body.buyingprice;
          const oldProductValue =
            req.body.quantityBefore * req.body.buyingpriceBefore;

          // The difference in product value
          const productValueDiff = newProductValue - oldProductValue;

          // Calculate the difference in quantity
          const diffQuantity = req.body.quantity - req.body.quantityBefore;

          if (existingRecord) {
            existingRecord.activeProductsCount += diffQuantity;
            existingRecord.activeProductsValue += productValueDiff;
            await existingRecord.save();
          } else {
            await createActiveProductsValue(
              req.body.quantity,
              newProductValue,
              req.body.currency,
              dbName
            );
          }
        } else {
          console.error("Currency not found 319");
        }
      }
    } catch (e) {
      console.error(e.message);
    }
    console.log(productData);
    if (productData.stocks) {
      await updateStocks(
        dbName,
        id,
        productData.stocks,
        productData.quantity,
        productData.name
      );
    }
    res.status(200).json({
      status: "true",
      message: "Product updated",
      data: product,
      movement: savedMovement,
    });
  } catch (error) {
    return new ApiError(`Error updating product: ${error.message}`, 500);
  }
});

// @desc Delete specific product
// @route Delete /api/product/:id
// @access Private
exports.archiveProduct = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );

  const productModel = db.model("Product", productSchema);

  const { id } = req.params;

  // Find the product by ID
  const product = await productModel.findById(id);

  if (!product) {
    return next(new ApiError(`No Product for this id ${id}`, 404));
  }
  try {
    const existingRecord = await ActiveProductsValue.findOne({
      currency: product.currency._id,
    });

    const diffValue = product.buyingprice * product.activeCount;
    product.archives = product.archives === "true" ? "false" : "true";

    // Update only the 'archives' field
    const updatedProduct = await productModel.findByIdAndUpdate(
      id,
      { $set: { archives: product.archives } },
      { new: true }
    );

    const movementType = product.archives === "true" ? "out" : "in";
    const movementDescription =
      product.archives === "true" ? "archive" : "unarchive";
    const savedMovement = await createProductMovement(
      id,
      product.quantity,
      movementType,
      movementDescription,
      dbName
    );

    if (existingRecord) {
      existingRecord.activeProductsCount -= product.activeCount;
      existingRecord.activeProductsValue -= diffValue;
      await existingRecord.save();
    } else {
      const productValue = product.activeCount * product.buyingprice;
      await createActiveProductsValue(
        product.activeCount,
        productValue,
        product.currency,
        dbName
      );
    }

    res.status(200).json({
      status: "success",
      message: "Product Archived",
      data: updatedProduct,
      movement: savedMovement,
    });
  } catch (error) {
    return new ApiError(`Error archiving product: ${error.message}`, 500);
  }
});

// @desc put Deactivate prodcut quantity
// @route put /api/product/deactivate
// @access Private
exports.deActiveProductQuantity = asyncHandler(async (req, res) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);

  const { id } = req.params;
  const productModel = db.model("Product", productSchema);

  const { newQuantity } = req.body;
  // Find the product by ID
  const product = await productModel.findById(id);

  if (!product) {
    return res
      .status(404)
      .json({ status: "false", message: "Product not found" });
  }

  try {
    const ActiveProductsValue = db.model(
      "ActiveProductsValue",
      ActiveProductsValueModel
    );
    const existingRecord = await ActiveProductsValue.findOne({
      currency: product.currency,
    });
    const diffValue = product.buyingprice * newQuantity;

    let type = "";
    let source = "";

    if (req.body.type === "deActive") {
      // Update the product
      await productModel.findByIdAndUpdate(id, {
        $inc: {
          deactivateCount: newQuantity,
          activeCount: -newQuantity,
        },
      });
      type = "out";
      source = "deactivate";

      if (existingRecord) {
        existingRecord.activeProductsCount -= newQuantity;
        existingRecord.activeProductsValue -= diffValue;
        await existingRecord.save();
      } else {
        const productValue = product.activeCount * product.buyingprice;
        await createActiveProductsValue(
          product.activeCount,
          productValue,
          product.currency,
          dbName
        );
      }
    } else if (req.body.type === "active") {
      await productModel.findByIdAndUpdate(id, {
        $inc: {
          deactivateCount: -newQuantity,
          activeCount: newQuantity,
        },
      });
      type = "in";
      source = "activate";

      if (existingRecord) {
        existingRecord.activeProductsCount += newQuantity;
        existingRecord.activeProductsValue += diffValue;
        await existingRecord.save();
      } else {
        await createActiveProductsValue(
          newQuantity,
          diffValue,
          product.currency,
          dbName
        );
      }
    }

    await createProductMovement(id, newQuantity, type, source, dbName);
    res.status(200).json({ status: "true", message: "Product Deactivated" });
  } catch (error) {
    return new ApiError(
      `Error activating/deactivating product: ${error.message}`,
      500
    );
  }
});

// @desc Get Ecommerc Active Product
// @route GET /api/product/ecommerce-active-product
// @access private
exports.ecommerceActiveProudct = asyncHandler(async (req, res) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);
  db.model("Category", categorySchema);

  const pageSize = req.query.limit || 15;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = { ecommerceActive: true };

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const totalItems = await productModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);
  const product = await productModel
    .find(query)
    .sort({ importDate: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate({ path: "category" });

  res.status(200).json({
    status: "true",
    results: product.length,
    Pages: totalPages,
    data: product,
  });
});

// @desc Get Ecommerce dashboard stats
// @route GET /api/product/ecommerce-dashboard-stats
// @access private
exports.ecommerceDashboardStats = asyncHandler(async (req, res) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const productModel = db.model("Product", productSchema);
  const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);

  const zeroQuantityCount = await productModel.countDocuments({ quantity: 0 });

  const ecommerceActiveCount = await productModel.countDocuments({
    ecommerceActive: true,
  });

  const ecommerceInactiveCount = await productModel.countDocuments({
    ecommerceActive: true,
    publish: false,
  });

  const publishedCount = await productModel.countDocuments({ publish: true });

  const totalOrderCount = await orderModel.countDocuments();

  res.status(200).json({
    status: "true",
    zeroQuantityCount,
    ecommerceActiveCount,
    ecommerceInactiveCount,
    publishedCount,
    totalOrderCount,
  });
});

// @desc Update the product to be featured
// @route PUT /api/featureProduct
// @access private
exports.setEcommerceProductFeatured = async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);

  try {
    const { productIds, categoryId, brandId, featured = true } = req.body;
    console.log(productIds);

    let updatedProducts;

    if (categoryId) {
      // Fetch all child categories for the given categoryId
      const allCategories = await getAllChildCategories(
        categoryId,
        db,
        categorySchema
      );

      // Update products by category
      updatedProducts = await productModel.updateMany(
        { category: { $in: allCategories } },
        { $set: { featured } }
      );

      if (updatedProducts.matchedCount === 0) {
        console.log("No products found for the given category ID.");
      }
    } else if (brandId) {
      updatedProducts = await productModel.updateMany(
        { brand: { $in: brandId } },
        { $set: { featured } }
      );
    } else {
      // Update products matching the given productIds
      updatedProducts = await Promise.all(
        productIds.map(async (productId) => {
          const product = await productModel.findByIdAndUpdate(
            productId,
            { featured },
            { new: true }
          );

          if (!product) {
            throw new Error(`Product with productId ${productId} not found.`);
          }

          return product;
        })
      );
    }

    res.status(200).json({ success: true, data: updatedProducts });
  } catch (error) {
    console.error("Error featuring product:", error.message);
    res.status(500).json({ error });
  }
};

// @desc Update the product to be featured
// @route GET /api/getFeatureProduct
// @access private
exports.getEcommerceProductFeatured = async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);

  try {
    const product = await productModel.find({ featured: true });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc Update the product to be sponsored
// @route PUT /api/sponsorProduct
// @access private
exports.setEcommerceProductSponsored = async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);

  try {
    const { productIds, brandId, categoryId, sponsored = true } = req.body;
    let updatedProducts;
    console.log(productIds);

    if (categoryId) {
      // Fetch all child categories for the given categoryId
      const allCategories = await getAllChildCategories(
        categoryId,
        db,
        categorySchema
      );

      // Update products by category
      updatedProducts = await productModel.updateMany(
        { category: { $in: allCategories } },
        { $set: { sponsored } }
      );

      if (updatedProducts.matchedCount === 0) {
        console.log("No products found for the given category ID.");
      }
    } else if (brandId) {
      updatedProducts = await productModel.updateMany(
        { brand: { $in: brandId } },
        { $set: { sponsored } }
      );
    } else {
      // Update products matching the given productIds
      updatedProducts = await Promise.all(
        productIds.map(async (productId) => {
          const product = await productModel.findByIdAndUpdate(
            productId,
            { sponsored },
            { new: true }
          );

          if (!product) {
            throw new Error(`Product with productId ${productId} not found.`);
          }

          return product;
        })
      );
    }

    res.status(200).json({ success: true, data: updatedProducts });
  } catch (error) {
    console.error("Error sponsoring product:", error.message);
    res.status(500).json({ error });
  }
};

// @desc Update the product to be sponsored
// @route GET /api/sponsorProduct
// @access private
exports.getEcommerceProductSponsored = async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);

  try {
    const product = await productModel.find({ sponsored: true });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc import products from Excel
// @route add /api/add
// @access Private
exports.addProduct = asyncHandler(async (req, res) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);

  const taxModel = db.model("Tax", TaxSchema);

  try {
    const { buffer } = req.file;

    let csvData;

    // Check the file type based on the file extension or content type
    if (
      req.file.originalname.endsWith(".csv") ||
      req.file.mimetype === "text/csv"
    ) {
      // Use csvtojson to convert CSV buffer to JSON array
      csvData = await csvtojson().fromString(buffer.toString());
    } else if (
      req.file.originalname.endsWith(".xlsx") ||
      req.file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      // Use xlsx library to convert XLSX buffer to JSON array
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheet_name_list = workbook.SheetNames;
      csvData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    console.log("Parsed CSV Data:", csvData);

    for (const item of csvData) {
      try {
        const tax = await taxModel.findById(item.tax);
        const finalPrice = item.price * (1 + tax.tax / 100);
        item.taxPrice = finalPrice;
        item.activeCount = item.quantity;
        // Extract stocks information from the item and add to the item
        item.stocks = [];
        if (item.stock && item.stockName && item.quantity) {
          item.stocks.push({
            stockId: item.stock,
            stockName: item.stockName,
            productQuantity: item.quantity,
          });
        }
        await createProductMovement(
          item._id,
          item.quantity,
          item.quantity,
          "in",
          "create",
          dbName
        );
        // Log to verify stocks are being added correctly
        console.log("Processed Item:", item);
      } catch (error) {
        // Handle errors when finding tax
        console.error(
          `Error finding tax for item with QR ${item.qr}: ${error.message}`
        );
      }
    }

    // Process your data and save to MongoDB using your mongoose model
    const duplicateQRs = [];

    // Use try-catch to catch duplicate key errors
    try {
      const insertedProducts = await productModel.insertMany(csvData, {
        ordered: false,
      });
      console.log("Inserted Products:", insertedProducts);
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        error.writeErrors.forEach((writeError) => {
          const duplicateQR = writeError.err.op.qr;
          duplicateQRs.push(duplicateQR);
          console.log(`Duplicate QR: ${duplicateQR}`);
        });
      } else {
        throw error; // Re-throw other errors
      }
    }

    res.json({ success: "Success", duplicateQRs });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});
