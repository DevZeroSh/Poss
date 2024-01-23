const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
      minlength: [3, "Too short product title"],
      maxlength: [100, "too long product title"],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    type: {
      type: String,
      default: "Normal",
    },
    description: {
      type: String,
      default: "Product description",
    },
    sold: {
      type: Number,
      default: 0,
    },
    serialNumber: [
      {
        type: String,
        default: "undefined",
      },
    ],
    quantity: { type: Number, default: 0 },
    price: {
      type: Number,
      default: 0,
    },
    buyingprice: {
      type: Number,
      default: 0,
    },

    priceAftereDiscount: {
      type: Number,
      default: null,
    },
    qr: {
      type: String,
      unique: [true, "Qr must be unique"],
      index: true,
    },
    sku: {
      type: String,
      default: 0,
    },

    image: {
      type: String,
      require: true,
    },

    brand: {
      type: mongoose.Schema.ObjectId,
      ref: "brand",
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
    },
    unit: {
      type: mongoose.Schema.ObjectId,
      ref: "Unit",
    },
    variant: {
      type: mongoose.Schema.ObjectId,
      ref: "Variant",
    },
    value: [String],

    variant2: {
      type: mongoose.Schema.ObjectId,
      ref: "Variant",
    },
    value2: [String],
    alarm: { type: Number, default: 0 },
    tax: {
      type: mongoose.Schema.ObjectId,
      ref: "Tax",
    },
    label: {
      type: mongoose.Schema.ObjectId,
      ref: "Labels",
    },
    taxPrice: { type: Number, default: 0 },
    archives: {
      type: String,
      enum: ["true", "false"],
      default: "false",
    },
    serialNumberType: {
      type: String,
      enum: ["true", "false"],
      default: "false",
    },
    currency: {
      type: mongoose.Schema.ObjectId,
      ref: "Currency",
    },
    profitRatio: { type: Number, default: 5 },
  },
  { timestamps: true }
);

const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/product/${doc.image}`;
    doc.image = imageUrl;
  }
};

productSchema.post("init", (doc) => {
  setImageURL(doc);
});

//Create
productSchema.post("save", (doc) => {
  setImageURL(doc);
});

productSchema.pre(/^find/, function (next) {
  this.populate({ path: "category", select: "name -_id" })
    .populate({ path: "brand", select: "name _id" })
    .populate({ path: "variant", select: "variant  _id" })
    .populate({ path: "unit", select: "name code  _id" })
    .populate({ path: "tax", select: "tax  _id" })
    .populate({ path: "label", select: "name  _id" })
    .populate({
      path: "currency",
      select: "currencyCode currencyName exchangeRate is_primary  _id",
    });
  next();
});

module.exports = productSchema;
