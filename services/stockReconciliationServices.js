const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const productSchema = require("../models/productModel");
const reconcilSchema = require("../models/stockReconciliationModel");
const emoloyeeShcema = require("../models/employeeModel");
const { createProductMovement } = require("../utils/productMovement");
const ActiveProductsValueModel = require("../models/activeProductsValueModel");
const { createActiveProductsValue } = require("../utils/activeProductsValue");

// @desc    Create a new stock reconciliation
// @route   POST /api/stockReconciliation
// @access  Private
exports.createStockReconciliation = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const reconciliationModel = db.model("Reconciliation", reconcilSchema);
  const productModel = db.model("Product", productSchema);
  db.model("Employee", emoloyeeShcema);

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
  const { title, items, employee, stockID, stockName } = req.body;

  // Create a new instance of the StockReconcil model
  const newStockReconcil = new reconciliationModel({
    title,
    reconcilingDate: formattedDate,
    items,
    employee,
    stockID,
    stockName,
  });

  const bulkOption2 = newStockReconcil.items
    .filter((item) => item.reconciled)
    .map((item) => ({
      updateOne: {
        filter: { qr: item.productBarcode, "stocks.stockId": stockID },
        update: {
          $set: {
            quantity: item.realCount,
            activeCount: item.realCount,
            "stocks.$.productQuantity": item.realCount,
          },
        },
      },
    }));

  // Save the new stock reconciliation record to the database
  await productModel.bulkWrite(bulkOption2, {});
  await newStockReconcil.save();

  const reconciliationId = newStockReconcil._id;

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
        item.productId, //productId
        reconciliationId, //reference
        item.realCount, //newQuantity
        item.difference, //quantity
        0, //newPrice
        0, //oldPrice
        "movement", //type
        "edit", //movementType
        "reconcile", //source
        dbName //dbName
      );
    }
  });

  return res.status(201).json({ success: true, data: newStockReconcil });
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
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );

  // Retrieve the existing reconciliation report to compare previous data
  const existingReconcileReport = await reconciliationModel.findById(
    req.params.id
  );
  if (!existingReconcileReport) {
    return next(
      new ApiError(
        `No reconciliation report found for id ${req.params.id}`,
        404
      )
    );
  }

  // Calculate currency diffs for active products value update
  const currencyDiffs = {};
  for (const item of req.body.items) {
    const existingItem = existingReconcileReport.items.find((existing) =>
      existing.productId.equals(item.productId)
    );

    if (existingItem && item.reconciled) {
      const quantityDiff = item.realCount - existingItem.realCount;
      const valueDiff = item.buyingPrice * quantityDiff;
      const product = await productModel.findById(item.productId);

      if (product) {
        const currencyId = product.currency._id;
        if (!currencyDiffs[currencyId]) {
          currencyDiffs[currencyId] = { totalCountDiff: 0, totalValueDiff: 0 };
        }

        currencyDiffs[currencyId].totalCountDiff += quantityDiff;
        currencyDiffs[currencyId].totalValueDiff += valueDiff;
      }
    }
  }

  // Update the reconciliation report with the new data
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

  // Perform bulk update for product quantities in the stock
  const bulkOption2 = reconcileReport.items
    .filter((item) => item.reconciled)
    .map((item) => ({
      updateOne: {
        filter: {
          qr: item.productBarcode,
          "stocks.stockId": reconcileReport.stockID,
        },
        update: {
          $set: {
            quantity: item.realCount,
            activeCount: item.realCount,
            "stocks.$.productQuantity": item.realCount,
          },
        },
      },
    }));
  await productModel.bulkWrite(bulkOption2);

  // Update ActiveProductsValue based on currency diffs
  for (const currencyId in currencyDiffs) {
    if (currencyDiffs.hasOwnProperty(currencyId)) {
      const { totalCountDiff, totalValueDiff } = currencyDiffs[currencyId];

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

      existingRecord.activeProductsCount += totalCountDiff;
      existingRecord.activeProductsValue += totalValueDiff;
      await existingRecord.save();
    }
  }

  res.status(200).json({
    status: "success",
    message: "Reconciliation report updated",
    data: reconcileReport,
  });
});
