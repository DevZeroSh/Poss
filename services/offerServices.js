const offerSchema = require("../models/offersModel");
const { default: mongoose } = require("mongoose");
const productSchema = require("../models/productModel");
const cron = require("node-cron");
const axios = require("axios");
const categorySchema = require("../models/CategoryModel");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const getAllChildCategories = require("../utils/CategoriesChild");
// @desc find the categors and what have a subCategor

const multerStorage = multer.memoryStorage();

const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images allowed", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadOfferImages = upload.fields([
  { name: "imageAr", maxCount: 1 },
  { name: "imageTr", maxCount: 1 },
]);

exports.resizeOfferImages = asyncHandler(async (req, res, next) => {
  if (req.files) {
    if (req.files.imageAr) {
      const filenameAr = `offer-${uuidv4()}-${Date.now()}-ar.png`;
      await sharp(req.files.imageAr[0].buffer)
        .toFormat("png")
        .png({ quality: 70 })
        .toFile(`uploads/offers/${filenameAr}`);

      req.body.imageAr = filenameAr;
    }

    if (req.files.imageTr) {
      const filenameTr = `offer-${uuidv4()}-${Date.now()}-tr.png`;
      await sharp(req.files.imageTr[0].buffer)
        .toFormat("png")
        .png({ quality: 70 })
        .toFile(`uploads/offers/${filenameTr}`);

      req.body.imageTr = filenameTr;
    }
  }

  next();
});

const setImageURL = (doc) => {
  if (doc.imageTr) {
    const imageUrlTr = `${process.env.BASE_URL}/offers/${doc.imageTr}`;
    doc.imageTr = imageUrlTr;
  }
  if (doc.imageAr) {
    const imageUrlAr = `${process.env.BASE_URL}/offers/${doc.imageAr}`;
    doc.imageAr = imageUrlAr;
  }
};

// @desc Post Create Offer
// @route Get /api/offer
// @accsess privet
exports.createOffer = async (req, res) => {
  const { databaseName } = req.query;
  const offerData = req.body;

  if (!databaseName) {
    return res.status(400).send({ error: "Database name is required" });
  }

  const db = mongoose.connection.useDb(databaseName);
  const Offer = db.model("Offer", offerSchema);
  const Product = db.model("Product", productSchema);

  try {
    if (offerData?.cat != [] && offerData?.cat?.length > 0) {
      // Get all child categories, including the parent category
      const allCategories = await getAllChildCategories(
        offerData.cat,
        db,
        categorySchema
      );

      // Find products in all these categories
      const products = await Product.find({ category: { $in: allCategories } });
      const applicableProducts = products.map((product) => product.id);
      offerData.applicableProducts = applicableProducts;
    } else if (offerData.brand !== "") {
      // Find products by brand
      const products = await Product.find({ brand: offerData.brand });
      const applicableProducts = products.map((product) => product.id);
      offerData.applicableProducts = applicableProducts;
    } else {
      // Find products by id
      const products = await Product.find({
        _id: { $in: offerData.applicableProducts },
      });
      const applicableProducts = products.map((product) =>
        product._id.toString()
      );

      offerData.applicableProducts = applicableProducts;
    }

    // Create and save the new offer
    const offer = new Offer(offerData);

    offerSchema.post("save", (doc) => {
      setImageURL(doc);
    });
    await offer.save();

    res.status(200).json({ status: "success", data: offer });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
};

// Function to update offer status for a specific database
const updateOfferStatusForDatabase = async (databaseName) => {
  const db = mongoose.connection.useDb(databaseName);
  const Product = db.model("Product", productSchema);
  const Offer = db.model("Offer", offerSchema);

  try {
    const currentDate = new Date();
    const currentHour = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      currentDate.getHours() + 3,
      0,
      0,
      0
    );

    // Find offers that end or start at the current hour
    const offersEndDate = await Offer.find({ endDate: currentHour });
    const offersStartDate = await Offer.find({ startDate: currentHour });

    if (offersEndDate.length > 0) {
      console.log(
        `Offers ending at the current hour in database ${databaseName}:`,
        offersEndDate
      );
      for (const offer of offersEndDate) {
        // Deactivate the offer
        offer.isActive = false;
        await offer.save();
        console.log(`Offer deactivated in database ${databaseName}`);

        // Update price in products
        await Product.updateMany(
          { _id: { $in: offer.applicableProducts } },
          { $set: { priceAftereDiscount: 0 } }
        );
      }
    }

    if (offersStartDate.length > 0) {
      console.log(
        `Offers starting at the current hour in database ${databaseName}:`,
        offersStartDate
      );
      for (const offer of offersStartDate) {
        // Activate the offer
        offer.isActive = true;
        await offer.save();

        // Update price in products
        if (offer.type === "poss") {
          await Product.updateMany({ _id: { $in: offer.applicableProducts } }, [
            {
              $set: {
                priceAftereDiscount: {
                  $multiply: [
                    "$taxPrice",
                    {
                      $subtract: [
                        1,
                        { $divide: [offer.discountPercentage, 100] },
                      ],
                    },
                  ],
                },
              },
            },
          ]);
        } else {
          await Product.updateMany({ _id: { $in: offer.applicableProducts } }, [
            {
              $set: {
                ecommercePriceAftereDiscount: {
                  $multiply: [
                    "$ecommercePrice",
                    {
                      $subtract: [
                        1,
                        { $divide: [offer.discountPercentage, 100] },
                      ],
                    },
                  ],
                },
              },
            },
          ]);
        }
      }
    }
  } catch (error) {
    console.error(
      `Failed to update offer status in database ${databaseName}:`,
      error
    );
  }
};

// Function to fetch all subscriber databases
const fetchAllSubscriberDatabases = async () => {
  try {
    console.log("Fetching subscriber databases...");

    // Make a request to get all subscriber databases
    const response = await axios.get(
      "https://demo.smartinb.ai:4001/api/subscribers"
    );

    if (response.data.status === "success") {
      const subscriberDatabases = response.data.data.map((user) => user.dbName);
      return subscriberDatabases;
    } else {
      throw new Error("Failed to fetch subscriber databases.");
    }
  } catch (error) {
    console.error("Error fetching subscriber databases:", error);
    return [];
  }
};

cron.schedule("0 * * * *", async () => {
  console.log("Running offer status update task for all databases...");

  const subscriberDatabases = await fetchAllSubscriberDatabases();

  for (const dbName of subscriberDatabases) {
    await updateOfferStatusForDatabase(dbName);
  }
});

exports.updateOffer = async (req, res) => {
  const { databaseName } = req.query;
  const offerId = req.params.id;
  const updateData = req.body;

  if (!databaseName) {
    return res.status(400).send({ error: "Database name is required" });
  }

  try {
    const db = mongoose.connection.useDb(databaseName);
    const Offer = db.model("Offer", offerSchema);

    const updatedOffer = await Offer.findOneAndUpdate(
      { _id: offerId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedOffer) {
      return res.status(404).send({ error: "Offer not found" });
    }
    res.status(200).json({ status: "success", data: updatedOffer });
  } catch (error) {
    res.status(500).send({ error: "Failed to update offer" });
  }
};

exports.deleteOffer = async (req, res) => {
  const { databaseName } = req.query;
  const offerId = req.params.id;

  if (!databaseName) {
    return res.status(400).send({ error: "Database name is required" });
  }

  try {
    const db = mongoose.connection.useDb(databaseName);

    const Offer = db.model("Offer", offerSchema);
    const Product = db.model("Product", productSchema);

    const offer = await Offer.findByIdAndDelete(offerId);
    const products = await Product.find({
      _id: { $in: offer.applicableProducts },
    });
    for (const product of products) {
      product.priceAftereDiscount = 0;
      await product.save();
    }
    if (!offer) {
      return res.status(404).send({ error: "Offer not found" });
    }

    res.send({ message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

exports.getOffer = async (req, res) => {
  const { databaseName } = req.query;

  if (!databaseName) {
    return res.status(400).send({ error: "Database name is required" });
  }

  try {
    // Use the specified database
    const db = mongoose.connection.useDb(databaseName);
    const pageSize = 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * pageSize;
    const Offer = db.model("Offer", offerSchema);

    // Get total count of documents for pagination
    const totalItems = await Offer.countDocuments();

    // Apply pagination to the query
    const offers = await Offer.find()
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    // Set image URLs for each offer
    offers.forEach(setImageURL);

    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
      status: "success",
      pages: totalPages,
      results: offers.length,
      data: offers,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

exports.getOneOffer = async (req, res) => {
  const { databaseName } = req.query;
  const offerId = req.params.id;

  if (!databaseName) {
    return res.status(400).send({ error: "Database name is required" });
  }

  try {
    const db = mongoose.connection.useDb(databaseName);

    const Offer = db.model("Offer", offerSchema);
    const Product = db.model("Product", productSchema);

    const offer = await Offer.findById(offerId).populate("applicableProducts");

    if (!offer) {
      return res.status(404).send({ error: "Offer not found" });
    }
    if (offer.imageAr) setImageURL(offer?.imageAr);
    if (offer.imageTr) setImageURL(offer?.imageTr);
    res.status(200).json({ status: "success", data: offer });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};
