const express = require("express");
const {
    createStockReconciliation,
    findAllReconciliations,
    findReconciliationReport,
    updataOneReconciliationReport,
} = require("../services/stockReconciliationServices");

const authService = require("../services/authService");

const StockReconciliationRoute = express.Router();

StockReconciliationRoute.use(authService.protect);

StockReconciliationRoute.route("/").get(findAllReconciliations);
StockReconciliationRoute.route("/:id").get(findReconciliationReport);
StockReconciliationRoute.route("/reconcile").post(createStockReconciliation);
StockReconciliationRoute.route("/reconcile/:id").put(updataOneReconciliationReport);

module.exports = StockReconciliationRoute;
