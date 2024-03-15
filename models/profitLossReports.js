const mongoose = require("mongoose");

const ProfitLossReportsSchema = new mongoose.Schema(
  {
    year: {
      type: String,
      require: [true, "Year missing"],
    },
    month: {
      type: String,
      require: [true, "Month missing"],
    },
    totalSellingPrice: {
      type: Number,
      require: [true, "Selling price missing"],
    },
    totalReturns: {
      type: Number,
      require: [true, "Total returns missing"],
    },
    totalSellingCost: {
      type: Number,
      require: [true, "Selling cost missing"],
    },
    totalExpenses: {
      type: Number,
      require: [true, "Expenses missing"],
    },
    profit: {
      type: Number,
      require: [true, "Profit missing"],
    },
    netProfit: {
      type: Number,
      require: [true, "Net profit missing"],
    },
  },
  { timestamps: true }
);

module.exports = ProfitLossReportsSchema;
