const { default: mongoose } = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    name: String,
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: String,
      default: "Stock description",
    },
    location: String,

    proudcts: [{
      proudctId: String,
      proudctName: String,
      proudctQuantity: Number,
    }]

  },
  { timestamps: true }
);

module.exports = stockSchema;
