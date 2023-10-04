const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const CartModel = require("../models/cartModel");
const productModel = require("../models/productModel");

//@desc Add product to Cart
//@route GEt /api/cart
//@accsess private/User

exports.addProductToCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.body;

  const prodcut = await productModel.findById(productId);

  // 1) Get Cart for logged user
  let cart = await CartModel.findOne({}); /*.findOne({user:req.user._id})*/
  if (!cart) {
    // If no cart exists, create a new one

    cart = await CartModel.create({
      cartItems: [{ prodcut: prodcut, price: prodcut.price }],
    });
  } else {
    // Product exists in the cart, update the product quantity or other details
    const productIndex = cart.cartItems.findIndex(
      (item) => item.prodcut.toString() === productId
    );
    console.log(productIndex);
    if (productIndex > -1) {
      console.log(cart.cartItems);
      const cartItem = cart.cartItems[productIndex];
      cartItem.quantity += 1;
      cart.cartItems[productIndex] = cartItem;
    } else {
      // Product not exists in the cart, update the product quantity or other details
      cart.cartItems.push({ prodcut: prodcut, price: prodcut.price });
    }
  }
  await cart.save();
});
