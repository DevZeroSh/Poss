const mongoose = require("mongoose");
const ApiError = require("../apiError");

exports.checkIdIfUsed = async (id, ExceptionalSchema) => {
    const modelNames = mongoose.modelNames();
    for (const modelName of modelNames) {
        if (modelName == ExceptionalSchema) {
            continue;
        }
        // Use the model name to get the Mongoose model dynamically
        const model = mongoose.model(modelName);

        // Check if the document with the specified _id exists in the current collection
        const document = await model.findById(id);

        // If the document is found, delete it and break out of the loop
        if (document) {
            return next(new ApiError(`The is used`, 500));
        }
    }
    return true;
};
