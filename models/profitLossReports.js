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
      default: 0,
      require: [true, "Total returns missing"],
    },
    netSales: {
      type: Number,
      default: 0,
      require: [true, "Net sales missing"],
    },
    totalSellingCost: {
      type: Number,
      default: 0,
      require: [true, "Selling cost missing"],
    },
    totalStockLoss: {
      type: Number,
      default: 0,
      require: [true, "Stock loss missing"],
    },
    totalExpenses: {
      type: Number,
      default: 0,
      require: [true, "Expenses missing"],
    },
    profit: {
      type: Number,
      default: 0,
      require: [true, "Profit missing"],
    },
    netProfit: {
      type: Number,
      default: 0,
      require: [true, "Net profit missing"],
    },
  },
  { timestamps: true }
);

module.exports = ProfitLossReportsSchema;
