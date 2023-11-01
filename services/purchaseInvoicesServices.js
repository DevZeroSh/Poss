const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const productModel = require("../models/productModel");
const PurchaseInvoicesModel = require("../models/purchaseinvoicesModel");
const Supplier = require("../models/suppliersModel");
exports.getProductInvoices = asyncHandler(async (req, res, next) => {
  const { qr, quantity, serialNumber, id } = req.body;
  const product = await productModel.findOne({ qr: qr });
  const sup = await Supplier.findById(id);
  console.log(sup);
  if (!product) {
    return next(new ApiError("Product not found", 404));
  }

  // Create a new purchase invoice
  const newPurchaseInvoice = new PurchaseInvoicesModel({
    invoices: [
      {
        product: product._id,
        quantity: quantity,
        name: product.name,
        qr: product.qr,
        taxPrice: product.taxPrice,
        tax: "Tax Type 1",
        price: product.price,
        serialNumber: serialNumber,
      },
    ],
    totalPrice: 250.0,
    totalPriceAfterDiscount: 225.0,
    supplier: sup,
    employee: req.user._id,
  });

  // Save the new purchase invoice to the database
  const savedInvoice = await newPurchaseInvoice.save();

  // Update the product quantities and set the filtered serial numbers
  const bulkOption = savedInvoice.invoices.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: {
        $inc: { quantity: +item.quantity },
        $set: { serialNumber: serialNumber },
      },
    },
  }));
  await productModel.bulkWrite(bulkOption, {});

  res.status(201).json({ status: "success", data: savedInvoice });
});

exports.findAllProductInvoices = asyncHandler(async (req, res, next) => {
  const purchase = await PurchaseInvoicesModel.find();
  res.status(200).json({ status: "true", results: purchase.length, data: purchase });
});
exports.updateInvoicesQuantity = asyncHandler(async (req, res, next) => {
  const { quantity } = req.body;
  const cart = await PurchaseInvoicesModel.findOne({ employee: req.user._id });
  if (!cart) {
    return next(
      new ApiError(`there is no cart for user ${req.user._id} `, 404)
    );
  }
  const itemIndex = cart.invoices.findIndex(
    (item) => item._id.toString() === req.params.itemId
  );

  if (itemIndex > -1) {
    const cartItem = cart.invoices[itemIndex];
    cartItem.quantity = quantity;
    cartItem.quantity = quantity;
    cart.invoices[itemIndex] = cartItem;
  } else {
    return next(
      new ApiError(`there is no item for this id: ${req.params.itemId}`, 404)
    );
  }

  await cart.save();
  res.status(200).json({
    status: "success",
    numberinvoices: cart.invoices.length,
    data: cart,
  });
});
