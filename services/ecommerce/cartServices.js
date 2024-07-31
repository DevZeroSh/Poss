const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const productSchema = require("../../models/productModel");
const CouponModel = require("../../models/discountModel");
const cartSchema = require("../../models/ecommerce/cartModel");
const categorySchema = require("../../models/CategoryModel");
const variantSchema = require("../../models/variantsModel");
const TaxSchema = require("../../models/taxModel");
const currencySchema = require("../../models/currencyModel");
const { default: mongoose } = require("mongoose");
const brandSchema = require("../../models/brandModel");
const labelsSchema = require("../../models/labelsModel");
const UnitSchema = require("../../models/UnitsModel");
const E_user_Schema = require("../../models/ecommerce/E_user_Modal");

const calclatTotalCartPrice = (cart) => {
  // Calculate Total cart Price
  let totalPrice = 0;

  cart.cartItems.forEach((item) => {
    totalPrice += item.quantity * item.taxPrice;
  });
  console.log(totalPrice);
  cart.totalCartPrice = totalPrice;
  return totalPrice;
};
const calclatTotalCartPriceAfterDiscont = (coupon, cart) => {
  let totalPriceAfterDiscount;
  let totalPrice = cart.totalCartPrice;
  if (coupon.discountType === "Percentages") {
    totalPriceAfterDiscount = (
      totalPrice -
      (totalPrice * coupon.quantity) / 100
    ).toFixed(2);
  } else {
    totalPriceAfterDiscount = (totalPrice - coupon.quantity).toFixed(2);

    console.log(totalPriceAfterDiscount);
  }
  cart.totalPriceAfterDiscount = totalPriceAfterDiscount;
};
//@desc Add product to Cart
//@route GEt /api/cart
//@accsess private/User
exports.addProductToCart = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const CartModel = db.model("Cart", cartSchema);
  const productModel = db.model("Product", productSchema);
  db.model("Category", categorySchema);
  db.model("Users", E_user_Schema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  const { qr, quantity, taxRate, taxs, price, taxPrice } = req.body; // Get the QR code from the request body
  // Find the product associated with the provided QR code
  const product = await productModel.findOne({ qr: qr });
  if (!product) {
    return res.status(404).json({
      status: "Error",
      message: "Product not found with the provided QR code.",
    });
  }
  // 1) Get Cart for the logged-in user
  let cart = await CartModel.findOne({ customar: req.user._id });
  if (!cart) {
    // If no cart exists, create a new one
    cart = await CartModel.create({
      customar: req.user._id,
      cartItems: [
        {
          product: product,
          taxPrice: taxPrice,
          name: product.name,
          qr: product.qr,
          quantity: quantity,
          taxRate: taxRate,
          taxs: taxs,
          price: price,
          image: product.image,
          maxQuantity: product.activeCount,
        },
      ],
    });
  } else {
    // Check if the product is already in the cart
    const productIndex = cart.cartItems.findIndex(
      (item) => item && item.qr.toString() === product.qr.toString()
    );

    if (productIndex > -1) {
      const cartItem = cart.cartItems[productIndex];
      cartItem.quantity++;
      cartItem.taxPrice = taxPrice;

      cart.cartItems[productIndex] = cartItem;
    } else {
      // Product does not exist in the cart, so add it
      cart.cartItems.push({
        product: product,
        taxPrice: taxPrice,
        name: product.name,
        qr: product.qr,
        quantity: quantity,
        taxRate: taxRate,
        taxs: taxs,
        price: price,
        image: product.image,
        maxQuantity: product.activeCount,
      });
    }
  }
  // Calculate Total cart Price
  if (cart.coupon !== "" && cart.coupon !== undefined) {
    calclatTotalCartPrice(cart);
    const coupon = await CouponModel.findOne({ discountName: cart.coupon });
    calclatTotalCartPriceAfterDiscont(coupon, cart);
  } else {
    calclatTotalCartPrice(cart);
  }
  await cart.save();
  res.status(200).json({
    status: "Success",
    numberCartItems: cart.cartItems.length,
    message: "Product added to cart successfully",
    data: cart,
  });
});

//@desc Get logged user Cart
//@route Get /api/cart
//@accsess private/User

exports.getLoggedUserCart = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const CartModel = db.model("Cart", cartSchema);
  db.model("Users", E_user_Schema);

  const cart = await CartModel.findOne({ customar: req.user._id });

  res.status(200).json({
    status: "success",
    numOfCartItems: cart?.cartItems?.length || 0,
    data: cart || [],
  });
});

//@desc Remove specific Cart item
//@route Delete /api/cart:itemId
//@accsess private/User

exports.removeSpecifcCartItem = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const CartModel = db.model("Cart", cartSchema);
  db.model("Users", E_user_Schema);
  const cart = await CartModel.findOneAndUpdate(
    { customar: req.user._id },
    { $pull: { cartItems: { _id: req.params.itemId } } },
    { new: true }
  );

  calclatTotalCartPrice(cart);

  cart.save();
  res.status(200).json({
    status: "Success",
    numberCartItems: cart.cartItems.length,
    data: cart,
  });
});

//@desc Clear specific user Item
//@route Delete /api/cart:itemId
//@accsess private/User

exports.clearCart = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const CartModel = db.model("Cart", cartSchema);
  db.model("Users", E_user_Schema);
  await CartModel.findOneAndDelete({ customar: req.user._id });

  res.status(200).send();
});
//@desc Update specific cart Item Quantity
//@route Put /api/cart:itemId
//@accsess private/User

exports.updateCartItemQuantity = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const CartModel = db.model("Cart", cartSchema);
  db.model("Users", E_user_Schema);
  const { quantity } = req.body;
  const cart = await CartModel.findOne({ customar: req.user._id });
  if (!cart) {
    return next(
      new ApiError(`there is no cart for user ${req.user._id} `, 404)
    );
  }
  const itemIndex = cart.cartItems.findIndex(
    (item) => item._id.toString() === req.params.itemId
  );

  if (itemIndex > -1) {
    const cartItem = cart.cartItems[itemIndex];
    cartItem.quantity = quantity;

    cart.cartItems[itemIndex] = cartItem;
  } else {
    return next(
      new ApiError(`there is no item for this id: ${req.params.itemId}`, 404)
    );
  }

  console.log(req.body);
  if (cart.coupon !== "" && cart.coupon !== undefined) {
    calclatTotalCartPrice(cart);
    const coupon = await CouponModel.findOne({ discountName: cart.coupon });
    calclatTotalCartPriceAfterDiscont(coupon, cart);
  } else {
    calclatTotalCartPrice(cart);
  }

  await cart.save();
  res.status(200).json({
    status: "success",
    numberCartItems: cart.cartItems.length,
    data: cart,
  });
});

// exports.clearCoupon = asyncHandler(async (req, res, next) => {
//   const dbName = req.query.databaseName;
//   const db = mongoose.connection.useDb(dbName);
//   const CartModel = db.model("Cart", cartSchema);
//   const cart = await CartModel.findOneAndUpdate({ employee: req.user._id });

//   if (cart.coupon !== undefined && cart.coupon !== "") {
//     cart.coupon = undefined;
//   }
//   if (
//     cart.totalPriceAfterDiscount !== undefined &&
//     cart.totalPriceAfterDiscount !== ""
//   ) {
//     cart.totalPriceAfterDiscount = undefined;
//   }
//   await cart.save();

//   res.status(200).send();
// });

//@desc Apply coupon on logged user cart
//@route Put /api/cart/applycoupon
//@accsess private/User
// exports.applyeCoupon = asyncHandler(async (req, res, next) => {
//   const { couponName } = req.body;
//   // 2) Get logged user cart to get total cart price

//   const cart = await CartModel.findOne({ employee: req.user._id });
//   // 1) Get coupon based on coupon name
//   const coupon = await CouponModel.findOne({ discountName: couponName });

//   if (!coupon) {
//     cart.totalPriceAfterDiscount = undefined;
//     cart.coupon = undefined;
//     await cart.save();
//     return next(new ApiError(`Coupon is Invalid or expired`));
//   }
//   // 3) calclate price after discount
//   calclatTotalCartPriceAfterDiscont(coupon, cart);

//   cart.coupon = coupon.discountName;
//   cart.couponCount = coupon.quantity;
//   cart.couponType = coupon.discountType;

//   await cart.save();
//   res.status(200).json({
//     status: "success",
//     numberCartItems: cart.cartItems.length,
//     coupon: coupon.discountName,
//     couponType: coupon.discountType,
//     couponCount: coupon.quantity,
//     data: cart,
//   });
// });
