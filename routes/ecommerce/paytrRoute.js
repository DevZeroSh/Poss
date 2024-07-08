const express = require("express");
const crypto = require("crypto");
const nodeBase64 = require("nodejs-base64-converter");
const axios = require("axios");
const paytrRouter = express.Router();

const merchant_id = 471531;
const merchant_key = "77ZNHe2byM2unZCU";
const merchant_salt = "zkAHcxfG7XnJNqWk";

console.log("Merchant ID:", merchant_id);
console.log("Merchant Key:", merchant_key);
console.log("Merchant Salt:", merchant_salt);

paytrRouter.post("/paytr-token", async (req, res) => {
  const {
    email,
    payment_amount,
    user_ip,
    user_name,
    user_address,
    user_phone,
    order,
  } = req.body;

  if (
    !email ||
    !payment_amount ||
    !user_ip ||
    !user_name ||
    !user_address ||
    !user_phone ||
    !order
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const userBasket = order?.data?.cartItems.map((item) => {
    return [item.product, item.taxPrice.toFixed(2), item.quantity];
  });
  const userBasketStr = JSON.stringify(userBasket);

  const merchant_oid = order?.data?._id;
  const user_basket = nodeBase64.encode(userBasketStr);
  const max_installment = "0";
  const no_installment = "0";
  const currency = "TL";
  const test_mode = "0";
  const merchant_ok_url = "http://localhost:3000/my_orders";
  const merchant_fail_url = "http://localhost:3000/error404";
  const timeout_limit = 30;
  const debug_on = 1;
  const lang = "en";

  const hashSTR = `${merchant_id}${user_ip}${merchant_oid}${email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`;
  const paytr_token = hashSTR + merchant_salt;

  const token = crypto
    .createHmac("sha256", merchant_key)
    .update(paytr_token)
    .digest("base64");

  const data = {
    merchant_id,
    user_ip,
    merchant_oid,
    email,
    payment_amount,
    user_basket,
    no_installment,
    max_installment,
    currency,
    test_mode,
    merchant_ok_url,
    merchant_fail_url,
    user_name,
    user_address,
    user_phone,
    timeout_limit,
    debug_on,
    lang,
    paytr_token: token,
  };

  try {
    const response = await axios.post(
      "https://www.paytr.com/odeme/api/get-token",
      data,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    if (response.data.status === "success") {
      res.json({ token: response.data.token });
    } else {
      console.error("Error response:", response.data);
      res.status(400).json({ error: "Failed to get token" });
    }
  } catch (error) {
    console.error("Error message:", error.message);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

paytrRouter.post("/callback", (req, res) => {
const callback = req.body;
  console.log("\n-------callback-------");
  console.log(callback);
  console.log("-------callback end-------\n");
   console.log("\n-------callback-------");
console.log(req);
  // Construct the hash
  const paytr_token =
    callback.merchant_oid +
    merchant_salt +
    callback.status +
    callback.total_amount;
  const token = crypto
    .createHmac("sha256", merchant_key)
    .update(paytr_token)
    .digest("base64");

  // Verify the hash
//  if (token !== callback.hash) {
  //  console.error("PAYTR notification failed: bad hash");
    //return res.status(400).send("Bad hash");
  //}

  // Process the payment status
  if (callback.status === "success") {
    // Payment successful
    console.log("Payment successful for order:", callback.merchant_oid);
    // Update your order status in the database
  } else {
    // Payment failed
    console.log("Payment failed for order:", callback.merchant_oid);
    // Update your order status in the database
  }

  res.send("OK");
});



module.exports = paytrRouter;
