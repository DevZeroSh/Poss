const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const CartModel = require("../models/cartModel");
const productModel = require("../models/productModel");

const calclatTotalCartPrice = (cart) => {
  // Calculate Total cart Price
  let totalPrice = 0;
  cart.cartItems.forEach((item) => {
    totalPrice += item.quantity * item.price;
  });
  cart.totalCartPrice = totalPrice;

  return totalPrice;
};

//@desc Add product to Cart
//@route GEt /api/cart
//@accsess private/User
exports.addProductToCart = asyncHandler(async (req, res, next) => {
  const { qr } = req.body; // Get the QR code from the request body

  // Find the product associated with the provided QR code
  const product = await productModel.findOne({ qr: qr });

  if (!product) {
    return res.status(404).json({
      status: "Error",
      message: "Product not found with the provided QR code.",
    });
  }

  // 1) Get Cart for the logged-in user
  let cart = await CartModel.findOne({ employee: req.user._id });

  if (!cart) {
    // If no cart exists, create a new one
    cart = await CartModel.create({
      employee: req.user._id,
      cartItems: [
        {
          product: product,
          price: product.price,
          name: product.name,
          qr: product.qr, // Include the "qr" field from the product
          quantity: 1, // Initialize the quantity as 1
        },
      ],
    });
  } else {
    // Check if the product is already in the cart
    const productIndex = cart.cartItems.findIndex(
      (item) => item && item.qr.toString() === product.qr.toString()
    );

    if (productIndex > -1) {
      // Product exists in the cart, update the product quantity
      const cartItem = cart.cartItems[productIndex];
      cartItem.quantity += 1;
      cart.cartItems[productIndex] = cartItem;
    } else {
      // Product does not exist in the cart, so add it
      cart.cartItems.push({
        product: product,
        price: product.price,
        name: product.name,
        qr: product.qr, // Include the "qr" field from the product
        quantity: 1, // Initialize the quantity as 1
      });
    }
  }

  // Calculate Total cart Price
  calclatTotalCartPrice(cart);

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
  const cart = await CartModel.findOne({ employee: req.user._id });

  if (!cart) {
    return next(
      new ApiError(`There is no cart for this user id: ${req.user._id}`)
    );
  }

  res.status(200).json({
    status: "Success",
    numberCartItems: cart.cartItems.length,
    data: cart,
  });
});

//@desc Remove specific Cart item
//@route Delete /api/cart:itemId
//@accsess private/User

exports.removeSpecifcCartItem = asyncHandler(async (req, res, next) => {
  const cart = await CartModel.findOneAndUpdate(
    { employee: req.user._id },
    { $pull: { cartItems: { _id: req.params.itemId } } },
    { new: true }
  ); /*user:req.user._id*/

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
  await CartModel.findOneAndDelete({ employee: req.user._id });

  res.status(200).send();
});

//@desc Update specific cart Item Quantity
//@route Put /api/cart:itemId
//@accsess private/User

exports.updateCartItemQuantity = asyncHandler(async (req, res, next) => {
  const { quantity } = req.body;
  const cart = await CartModel.findOne({ employee: req.user._id });
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
  calclatTotalCartPrice(cart);

  await cart.save();
  res.status(200).json({
    status: "success",
    numberCartItems: cart.cartItems.length,
    data: cart,
  });
});
