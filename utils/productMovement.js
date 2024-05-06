const mongoose = require("mongoose");
const ProductMovementSchema = require("../models/productMovementModel");
const ApiError = require("./apiError");

const createProductMovement = async (
    productId,
    newQuantity,
    quantity,
    movementType,
    source,
    dbName
) => {
    const db = mongoose.connection.useDb(dbName);
    const movementSchema = db.model("ProductMovement", ProductMovementSchema);

    try {
        const newMovement = new movementSchema({
            productId,
            quantity,
            newQuantity,
            movementType,
            source,
        });
        const savedMovement = await newMovement.save();
        
        return savedMovement;
    } catch (error) {
        return new ApiError(`Error creating product: ${error.message}`, 500);
    }
    
};

module.exports = { createProductMovement };
