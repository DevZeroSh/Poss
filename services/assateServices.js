const  mongoose  = require("mongoose");
const assetsSchema = require("../models/assetsModel");
const asyncHandler = require("express-async-handler");

exports.createAssts = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const assetsModel = db.model("Assets", assetsSchema);
  if (req.body.type === "building") {
    const findBuilding = await assetsModel.findOne({ type: "building" });
    console.log(findBuilding)
    req.body.parentAccountCode = 1211;
    req.body.code = 121100;
  }
//   const createAccount = await assetsModel.create(req.body);

//   res.status(200).json({ status: "success", data: createAccount });
});
