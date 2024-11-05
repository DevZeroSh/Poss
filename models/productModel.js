const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
    nameAR: {
      type: String,
      default: "name AR",
    },
    nameTR: {
      type: String,
      default: "name TR",
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
      default: " short Description AR",
    },
    shortDescriptionAR: {
      type: String,
      default: " short Description AR",
    },
    shortDescriptionTR: {
      type: String,
      default: " short Description TR",
    },
    description: {
      type: String,
      default: "Product description",
      default: "Product description AR",
    },
    descriptionAR: {
      type: String,
      default: "Product description AR",
    },
    descriptionTR: {
      type: String,
      default: "Product description TR",
    },
    sold: {
      type: Number,
      default: 0,
    },
    density: String,
    quantity: { type: Number, default: 0 },
    price: {
      type: Number,
      default: 0,
    },
    ecommercePrice: {
      type: Number,
      default: 0,
    },
    ecommercePriceBeforeTax: {
      type: Number,
      default: 0,
    },
    ecommercePriceAftereDiscount: {
      type: Number,
      default: 0,
    },
    buyingprice: {
      type: Number,
      default: 0,
    },

    priceAftereDiscount: {
      type: Number,
      default: 0,
    },
    qr: {
      type: String,
      unique: [true, "QR must be unique"],
      minlength: [3, "Too short QR code"],
      maxlength: [30, "Too long QR code"],
      index: true,
      require: true,
    },
    sku: {
      type: String,
      default: 0,
    },
    image: {
      type: String,
    },
    imagesArray: [
      {
        image: String,
        isCover: { type: Boolean, default: false },
        _id: false,
      },
    ],

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
    customAttributes: [
      {
        key: String,
        value: String,
        _id: false,
      },
    ],
    addToCart: { type: Number, default: 0 },
    addToFavourites: { type: Number, default: 0 },
    stocks: [
      {
        stockId: String,
        stockName: String,
        productQuantity: Number,
        _id: false,
      },
    ],
    ecommerceActive: { type: Boolean, default: false },
    publish: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    sponsored: { type: Boolean, default: false },
    height: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: 0,
    },
    weight: {
      type: Number,
      default: 0,
    },
    length: {
      type: Number,
      default: 0,
    },
    shippingCompany: {
      type: mongoose.Schema.ObjectId,
      ref: "ShippingCompany",
    },
    alternateProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        _id: false,
      },
    ],
    groupID: { type: String },
    importDate: Date,
    suppliers: [String],
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
    const imageList = doc.imagesArray.map(
      (image) => `${process.env.BASE_URL}/product/${image.image}`
    );
    doc.imagesArray = imageList;
  }
};

productSchema.post("save", (doc) => {
  setImageURL(doc);
});

productSchema.post("find", function (docs) {
  docs.forEach(setImageURL);
});

productSchema.virtual("review", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

module.exports = productSchema;
