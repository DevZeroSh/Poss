const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const productModel = require("../models/productModel");
const PurchaseInvoicesModel = require("../models/purchaseinvoicesModel");
const Supplier = require("../models/suppliersModel");
exports.getProductInvoices = asyncHandler(async (req, res, next) => {
  // app settings
  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = date_ob.getDate();
  let month = date_ob.getMonth() + 1;
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours();
  let minutes = date_ob.getMinutes();
  let seconds = date_ob.getSeconds();
  const dates =
    date +
    "-" +
    month +
    "-" +
    year +
    "-" +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;

  const {
    invoices,
    supid,
    totalProductTax,
    totalPriceWitheOutTax,
    finalPrice,
    totalQuantity,
    totalbuyingprice,
  } = req.body;

  // Find the supplier
  const sup = await Supplier.findById(supid);

  // Create an array to store the invoice items
  const invoiceItems = [];
  let bulkOption;

  for (const item of invoices) {
    const {
      quantity,
      qr,
      serialNumber,
      buyingprice,
      totalPrice,
      taxRate,
      taxPrice,
      totalTax,
    } = item;
    // Find the product based on the  QR code
    const productDoc = await productModel.findOne({ qr });

    if (!productDoc) {
      console.log(`Product not found for QR code: ${qr}`);
      continue;
    }
    // Create an invoice item
    const invoiceItem = {
      product: productDoc._id,
      name: productDoc.name,
      quantity,
      qr,
      serialNumber: serialNumber,
      buyingprice: buyingprice,
      taxPrice: taxPrice,
      taxRate: taxRate,
      totalTax: totalTax,
      totalPrice: totalPrice,
    };

    invoiceItems.push(invoiceItem);
  }
  bulkOption = invoiceItems.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: {
        $inc: { quantity: +item.quantity },
        $set: { serialNumber: item.serialNumber, price: item.price },
      },
    },
  }));
  await productModel.bulkWrite(bulkOption, {});

  // Create a new purchase invoice with all the invoice items
  const newPurchaseInvoice = new PurchaseInvoicesModel({
    invoices: invoiceItems,
    paidAt: dates,
    supplier: sup,
    totalProductTax: totalProductTax,
    totalPriceWitheOutTax: totalPriceWitheOutTax,
    totalbuyingprice: totalbuyingprice,
    finalPrice: finalPrice,
    totalQuantity: totalQuantity,
    employee: req.user._id,
  });

  // Save the new purchase invoice to the database
  const savedInvoice = await newPurchaseInvoice.save();

  // Respond with the created invoice
  res.status(201).json({ status: "success", data: savedInvoice });
});

exports.findAllProductInvoices = asyncHandler(async (req, res, next) => {
  const ProductInvoices = await PurchaseInvoicesModel.find();
  res.status(200).json({
    status: "true",
    results: ProductInvoices.length,
    data: ProductInvoices,
  });
});
exports.findOneProductInvoices = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const ProductInvoices = await PurchaseInvoicesModel.findById(id);
  console.log(ProductInvoices);
  if (!ProductInvoices) {
    return next(new ApiError(`No ProductInvoices for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: ProductInvoices });
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
