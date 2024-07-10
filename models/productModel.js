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
    shortDescription: {
      type: String,
      default: "Product short description",
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
      minlength: [3, "Too short product title"],
      maxlength: [30, "too long product title"],
      index: true,
      require: true,
    },
    sku: {
      type: String,
      default: 0,
    },

    image: {
      type: String,
      require: true,
    },
    imagesArray: [String],

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

    activeCount: { type: Number, default: 0 },
    deactivateCount: { type: Number, default: 0 },


    currency: {
      type: mongoose.Schema.ObjectId,
      ref: "Currency",
    },
    profitRatio: { type: Number, default: 5 },
    ratingsAverage: {
      type: Number,
      default: 0,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    customAttributes: {
      type: Map,
      of: String,
    },
    addToCart: { type: Number, default: 0 },
    stocks: [{
      stockId: String,
      stockName: String,
      productQuantity: Number
    }],
    ecommerceProducts: Boolean,
    ecommerceActive: Boolean,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);



const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/product/${doc.image}`;
    doc.image = imageUrl;
  }
  if (doc.imagesArray) {
    const imageList = [];
    doc.imagesArray.forEach((image) => {
      const imageUrl = `${process.env.BASE_URL}/product/${image}`;
      imageList.push(imageUrl);
    });
    doc.imagesArray = imageList;

  }
};

productSchema.post("find", function (docs) {
  docs.forEach(setImageURL);
});

//Create
productSchema.post("save", (doc) => {
  setImageURL(doc);
});

productSchema.virtual("review", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});


module.exports = productSchema;
