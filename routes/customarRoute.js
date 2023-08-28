const express = require("express");
const { createCustomar,getCustomars,getCustomar, updataCustomar, deleteCustomar } = require("../services/customarServices");
const {createCustomarVlaidator,updataCustomarVlaidator,getCustomarVlaidator,deleteCustomarVlaidator} = require("../utils/validators/customarValidator");

const router = express.Router();

router.route('/').post(createCustomarVlaidator,createCustomar).get(getCustomars);
router.route('/:id').get(getCustomarVlaidator,getCustomar).put(updataCustomarVlaidator,updataCustomar).delete(deleteCustomarVlaidator,deleteCustomar);


module.exports = router;