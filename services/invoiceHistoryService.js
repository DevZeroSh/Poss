const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const invoiceHistorySchema = require("../models/invoiceHistoryModel");
const emoloyeeShcema = require("../models/employeeModel");
const { ObjectId } = require("mongodb");

// Create a new invoice history entry
// exports.createInvoiceHistory = asyncHandler(async (req, res) => {
//     try {
//         const dbName = req.body.databaseName;
//         const db = mongoose.connection.useDb(dbName);

//         const invoiceHistoryModel = db.model("invoiceHistory", invoiceHistorySchema);

//         const invoiceHistoryData = new invoiceHistoryModel({
//             invoiceId: req.body.invoiceId,
//             historyType: req.body.historyType,
//             employeeId: req.body.employeeId,
//         });
//         const savedInvoiceHistory = await invoiceHistoryModel.create(invoiceHistoryData);

//         res.status(201).json({ status: "true", data: savedInvoiceHistory });
//     } catch (error) {
//         console.log(error.message);
//         res.status(500).json({ status: "false", error: error.message });
//     }
// });

exports.createInvoiceHistory = async (databaseName, invoiceId, historyType, employeeId) => {
    try {
        const dbName = databaseName;
        const db = mongoose.connection.useDb(dbName);

        const invoiceHistoryModel = db.model("invoiceHistory", invoiceHistorySchema);

        const invoiceHistoryData = new invoiceHistoryModel({
            invoiceId,
            historyType,
            employeeId,
        });
        const savedInvoiceHistory = await invoiceHistoryModel.create(invoiceHistoryData);

        return savedInvoiceHistory;
    } catch (error) {
        console.log(error.message);
        return new ApiError(`Error creating invoice history: ${error.message}`, 500);
    }
};

// Retrieve invoice history by invoice ID
exports.getInvoiceById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const dbName = req.query.databaseName;
        const db = mongoose.connection.useDb(dbName);
        db.model("Employee", emoloyeeShcema);

        const invoiceHistoryModel = db.model("invoiceHistory", invoiceHistorySchema);

        // Validate if the id is a valid ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ status: "false", error: "Invalid invoiceId format" });
        }

        // Convert id to ObjectId
        const objectId = new ObjectId(id);

        const invoiceHistory = await invoiceHistoryModel
            .find({ invoiceId: objectId })
            .populate("employeeId");

        res.status(200).json({ status: "true", data: invoiceHistory });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ status: "false", error: error.message });
    }
});
