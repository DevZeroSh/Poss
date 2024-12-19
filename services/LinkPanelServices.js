const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const LinkPanelSchema = require("../models/linkPanelModel");

exports.getAllLinkPanel = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const LinkPanelModel = db.model("linkPanel", LinkPanelSchema);
  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await LinkPanelModel.countDocuments();

  const totalPages = Math.ceil(totalItems / pageSize);
  const LinkPanel = await LinkPanelModel
    .find()
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    Pages: totalPages,
    results: LinkPanel.length,
    data: LinkPanel,
  });
});

exports.createLinkPanel = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const LinkPanelModel = db.model("linkPanel", LinkPanelSchema);

  const LinkPanel = await LinkPanelModel.create(req.body);
  res.status(200).json({ message: "success", data: LinkPanel });
});

exports.updateLinkPanel = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const LinkPanelModel = db.model("linkPanel", LinkPanelSchema);
  const { id } = req.params;
  console.log(req.body);
  
  const LinkPanel = await LinkPanelModel.findByIdAndUpdate(
    id,
    req.body,
    { new: true }
  );
  res.status(200).json({ message: "success", data: LinkPanel });
});
