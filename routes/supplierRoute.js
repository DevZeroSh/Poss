const express = require("express");
const {createSupplierValidator,updataSupplierVlaidator,getSupplierVlaidator,deleteSupplierVlaidator} = require("../utils/validators/supplierValidator")
const { createSupplier,getSuppliers,getSupplier,updataSupplier,deleteSupplier} = require("../services/supplierServices");

const authService = require('../services/authService');
const router = express.Router();
router.use(authService.protect);

router.route('/')
    .post(authService.allowedTo("supllier"),createSupplierValidator,createSupplier)
    .get(getSuppliers);
    
router.route('/:id')
    .get(getSupplierVlaidator,getSupplier)
    .put(authService.allowedTo("supllier"),updataSupplierVlaidator,updataSupplier)
    .delete(authService.allowedTo("delete supllier"),deleteSupplierVlaidator,deleteSupplier);

module.exports = router;