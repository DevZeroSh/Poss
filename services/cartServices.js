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
  const { productId } = req.body;

  const prodcut = await productModel.findById(productId);

  // 1) Get Cart for logged user
  let cart = await CartModel.findOne({}); /*.findOne({user:req.user._id})*/
  if (!cart) {
    // If no cart exists, create a new one
    console.log("test1");
    cart = await CartModel.create({
      cartItems: [
        {
          prodcut: prodcut,
          price: prodcut.price,
          name: prodcut.name,
          qr: prodcut.qr,
        },
      ],
    });
  } else {
    console.log("test2");
    // Product exists in the cart, update the product quantity or other details
    const productIndex = cart.cartItems.findIndex(
      (item) => item.prodcut.toString() === productId
    );
    if (productIndex > -1) {
      console.log("test3");
      console.log(cart.cartItems);
      const cartItem = cart.cartItems[productIndex];
      cartItem.quantity += 1;
      cart.cartItems[productIndex] = cartItem;
    } else {
      // Product not exists in the cart, update the product quantity or other details
      cart.cartItems.push({
        prodcut: prodcut,
        price: prodcut.price,
        name: prodcut.name,
        qr: prodcut.qr,
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
  const cart = await CartModel.findOne({}); /*user:req.user._id*/

  if (!cart) {
    return next(
      new ApiError(`There is no cart for this user id: {req.user._id}`)
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
    {},
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
  await CartModel.findOneAndDelete({}); /*user:req.user._id*/

  res.status(200).send();
});

//@desc Update specific cart Item Quantity
//@route Put /api/cart:itemId
//@accsess private/User

exports.updateCartItemQuantity = asyncHandler(async (req, res, next) => {
  const { quantity } = req.body;
  const cart = await CartModel.findOne({}); /*user:req.user/_id*/
  if (!cart) {
    return next(new ApiError(`there is no cart for user {req.user._id} `, 404));
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
