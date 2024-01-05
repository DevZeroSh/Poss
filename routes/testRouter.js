const express = require("express");
const bodyParser = require("body-parser");
var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;
const hosingRouter = express.Router();
hosingRouter.use(bodyParser.json());
const TestSchema = require("../models/test");

hosingRouter
   .route("/")
   .options(cors.corsWithOptions, (req, res) => {
      res.sendStatus(200);
   })
   .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
     

      const url = config.mongoUrl;
    const connect = mongoose.connect(url);


      const newDB = mongoose.connection.useDb(req.user.dbName);
        const Test = newDB.model('tests', TestSchema)
        Test.find()
         .then(
            (hosings) => {
               res.statusCode = 200;
               res.setHeader("Content-Type", "application/json");
               res.json(hosings);
            },
            (err) => next(err)
         )
         .catch((err) => next(err));
   })