const mongoose = require("mongoose");

const kvkkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },

  description: {
    type: String,
  },
});

const privacyPolicySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },

  description: {
    type: String,
  },
});
const termsOfUseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },

  description: {
    type: String,
  },
});

module.exports = {
  kvkkSchema,
  privacyPolicySchema,
  termsOfUseSchema,
};
