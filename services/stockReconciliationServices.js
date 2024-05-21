const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const productSchema = require("../models/productModel");
const reconcilSchema = require("../models/stockReconciliationModel");
const emoloyeeShcema = require("../models/employeeModel");
const { createProductMovement } = require("../utils/productMovement");
const ActiveProductsValueModel = require("../models/activeProductsValueModel");
const { createActiveProductsValue } = require("../utils/activeProductsValue");
const currencySchema = require("../models/currencyModel");
const categorySchema = require("../models/CategoryModel");
const brandSchema = require("../models/brandModel");
const labelsSchema = require("../models/labelsModel");
const TaxSchema = require("../models/taxModel");
const UnitSchema = require("../models/UnitsModel");
const variantSchema = require("../models/variantsModel");

// @desc    Create a new stock reconciliation
// @route   POST /api/stockReconciliation
// @access  Private
exports.createStockReconciliation = asyncHandler(async (req, res, next) => {
  try {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const reconciliationModel = db.model("Reconciliation", reconcilSchema);
    const productModel = db.model("Product", productSchema);
    db.model("Currency", currencySchema);
    db.model("Employee", emoloyeeShcema);
    db.model("Category", categorySchema);
    db.model("brand", brandSchema);
    db.model("Labels", labelsSchema);
    db.model("Tax", TaxSchema);
    db.model("Unit", UnitSchema);
    db.model("Variant", variantSchema);
    db.model("Currency", currencySchema);

    // Dealing with date and time START
    // To add 0 if the numeber is smaller than 10
    function padZero(value) {
      return value < 10 ? `0${value}` : value;
    }

    // Breaking down the date-time
    let ts = Date.now();
    let date_ob = new Date(ts);
    let date = padZero(date_ob.getDate());
    let month = padZero(date_ob.getMonth() + 1);
    let year = date_ob.getFullYear();
    let hours = padZero(date_ob.getHours());
    let minutes = padZero(date_ob.getMinutes());
    let seconds = padZero(date_ob.getSeconds());

    // Formatting the date and time
    const formattedDate =
      year +
      "-" +
      month +
      "-" +
      date +
      " " +
      hours +
      ":" +
      minutes +
      ":" +
      seconds;
    // Dealing with date and time END

    // Extract data from the request body
    const { title, items, employee } = req.body;

    // Create a new instance of the StockReconcil model
    const newStockReconcil = new reconciliationModel({
      title,
      reconcilingDate: formattedDate,
      items,
      employee,
    });

    const bulkOption2 = newStockReconcil.items
      .filter((item) => item.reconciled)
      .map((item) => ({
        updateOne: {
          filter: { qr: item.productBarcode },
          update: {
            $set: {
              quantity: item.realCount,
              activeCount: item.realCount,
            },
          },
        },
      }));

    // Save the new stock reconciliation record to the database
    await productModel.bulkWrite(bulkOption2, {});
    await newStockReconcil.save();
    req.body.items.map(async (item) => {
      if (item.reconciled) {
        try {
          const ActiveProductsValue = db.model(
            "ActiveProductsValue",
            ActiveProductsValueModel
          );
          const currencyDiffs = {};

          for (const existingItem of req.body.items) {
            if (existingItem.productId === item.productId) {
              const product = await productModel.findOne({
                _id: item.productId,
              });

              if (product) {
                const currencyId = product.currency._id;

                if (!currencyDiffs[currencyId]) {
                  currencyDiffs[currencyId] = {
                    totalCountDiff: 0,
                    totalValueDiff: 0,
                  };
                }

                const quantityDiff = item.realCount - item.recordCount;
                const valueDiff = item.buyingPrice * quantityDiff;

                currencyDiffs[currencyId].totalCountDiff += quantityDiff;
                currencyDiffs[currencyId].totalValueDiff += valueDiff;
              } else {
                console.warn(`Product with ID ${item.productId} not found.`);
              }
            }
          }

          for (const currencyId in currencyDiffs) {
            if (currencyDiffs.hasOwnProperty(currencyId)) {
              const { totalCountDiff, totalValueDiff } =
                currencyDiffs[currencyId];
              const existingRecord = await ActiveProductsValue.findOne({
                currency: currencyId,
              });

              if (existingRecord) {
                existingRecord.activeProductsCount += totalCountDiff;
                existingRecord.activeProductsValue += totalValueDiff;
                await existingRecord.save();
              } else {
                await createActiveProductsValue(
                  totalCountDiff,
                  totalValueDiff,
                  currencyId,
                  dbName
                );
              }
            }
          }
        } catch (err) {
          console.log("stockReconciliationServices 100");
          console.log(err.message);
        }

        createProductMovement(
          item.productId,
          item.realCount,
          item.difference,
          "edit",
          "reconcile",
          dbName
        );
      }
    });

    return res.status(201).json({ success: true, data: newStockReconcil });
  } catch (error) {
    console.error("Error creating stock reconciliation:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Could not create stock reconciliation" });
  }
});

// @desc    Get all reconciliation
// @route   GET /api/stockReconciliation
// @access  Private
exports.findAllReconciliations = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const reconciliationModel = db.model("Reconciliation", reconcilSchema);
  db.model("Employee", emoloyeeShcema);

  const mongooseQuery = reconciliationModel.find({}).sort({ createdAt: -1 });
  const reconciliation = await mongooseQuery;
  if (!reconciliation) {
    return next(new ApiError(`Couldn't get the reports`, 404));
  }

  res.status(200).json({
    status: "true",
    results: reconciliation.length,
    data: reconciliation,
  });
});

// @desc    Get one reconciliation report by ID
// @route   GET /api/stockReconciliation/:id
// @access  Private
exports.findReconciliationReport = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const reconciliationModel = db.model("Reconciliation", reconcilSchema);
  db.model("Employee", emoloyeeShcema);

  const { id } = req.params;
  const reconciliation = await reconciliationModel
    .findById(id)
    .sort({ createdAt: -1 });

  if (!reconciliation) {
    return next(
      new ApiError(`No reconciliation record for this id ${id}`, 404)
    );
  }
  res.status(200).json({ status: "true", data: reconciliation });
});

// @desc    Get one reconciliation report by ID
// @route   GET /api/stockReconciliation/:id/edit
// @access  Private
exports.updataOneReconciliationReport = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const reconciliationModel = db.model("Reconciliation", reconcilSchema);
  const productModel = db.model("Product", productSchema);
  db.model("Currency", currencySchema);
  db.model("Employee", emoloyeeShcema);
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

  const existingReconcileReport = await reconciliationModel.findById(
    req.params.id
  );
  let realCountOld = [];
  existingReconcileReport.items.map((item) => {
    realCountOld.push(item.realCount - item.recordCount);
  });

  const reconcileReport = await reconciliationModel.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true }
  );

  if (!reconcileReport) {
    return next(
      new ApiError(`No reconcileReport found for id ${req.params.id}`, 404)
    );
  }

  // Update the quantity and activeCount of reconciled products
  const bulkOption2 = reconcileReport.items
    .filter((item) => item.reconciled)
    .map((item) => ({
      updateOne: {
        filter: { qr: item.productBarcode },
        update: {
          $set: {
            quantity: item.realCount,
            activeCount: item.realCount,
          },
        },
      },
    }));

  await productModel.bulkWrite(bulkOption2, {});

  req.body.items.forEach(async (item, i) => {
    if (item.reconciled) {
      try {
        const existingItem = existingReconcileReport.items.find((existing) =>
          existing.productId.equals(item.productId)
        );

        if (existingItem) {
          const valueDiff =
            item.buyingPrice * item.exchangeRate * realCountOld[i];

          const product = await productModel.findOne({ _id: item.productId });

          if (product) {
            const currencyId = product.currency._id;

            let existingRecord = await ActiveProductsValue.findOne({
              currency: currencyId,
            });
            if (!existingRecord) {
              existingRecord = await createActiveProductsValue(
                0,
                0,
                currencyId,
                dbName
              );
            }

            // Update the counts and values for the currency
            existingRecord.activeProductsCount += realCountOld[i];
            existingRecord.activeProductsValue += valueDiff;
            await existingRecord.save();
          } else {
            console.warn(`Product with ID ${item.productId} not found.`);
          }
        }
      } catch (err) {
        console.log("stockReconciliationServices:", err.message);
      }

      createProductMovement(
        item.productId,
        item.realCount,
        item.differenceQty,
        "edit",
        "reconcile",
        dbName
      );
    }
  });

  res.status(200).json({
    status: "success",
    message: "Reconciling report updated",
    data: reconcileReport,
  });
});
