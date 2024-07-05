const express = require("express");
const crypto = require("crypto");
const nodeBase64 = require("nodejs-base64-converter");
const axios = require("axios");
const paytrRouter = express.Router();

const merchant_id = 471531;
const merchant_key = "77ZNHe2byM2unZCU";
const merchant_salt ="zkAHcxfG7XnJNqWk";

console.log('Merchant ID:', merchant_id);
console.log('Merchant Key:', merchant_key);
console.log('Merchant Salt:', merchant_salt);

paytrRouter.post("/paytr-token", async (req, res) => {
  const {
    email,
    payment_amount,
    user_ip,
    user_name,
    user_address,
    user_phone,
  } = req.body;
  const merchant_oid = "IN" + Date.now();
  const basket = JSON.stringify([
    ["Product 1", "100.00", 1],
    ["Product 2", "200.00", 2],
  ]);
  const user_basket = nodeBase64.encode(basket);
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
  console.log("paytr_token")
  console.log(paytr_token)
  console.log("merchant_key")
  console.log(merchant_key)
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
  console.log(req);
  const callback = req.body;
  const paytr_token =
    callback.merchant_oid +
    merchant_salt +
    callback.status +
    callback.total_amount;
  const token = crypto
    .createHmac("sha256", merchant_key)
    .update(paytr_token)
    .digest("base64");

  if (token !== callback.hash) {
    console.error("Hash mismatch:", token, callback.hash);
    return res.status(400).send("PAYTR notification failed: bad hash");
  }

  if (callback.status === "success") {
    console.log("Payment success for order:", callback.merchant_oid);
  } else {
    console.log("Payment failed for order:", callback.merchant_oid);
  }

  res.send("OK");
});

module.exports = paytrRouter;
