const express = require("express");
const { createCustomar,getCustomars,getCustomar, updataCustomar, deleteCustomar } = require("../services/customarServices");
const {createCustomarVlaidator} = require("../utils/validators/customarValidator");

const router = express.Router();

router.route('/').post(createCustomarVlaidator,createCustomar).get(getCustomars);
router.route('/:id').get(getCustomar).put(updataCustomar).delete(deleteCustomar);


module.exports = router;