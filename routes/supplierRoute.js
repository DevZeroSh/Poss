const express = require("express");
const {createSupplierValidator,updataSupplierVlaidator,getSupplierVlaidator,deleteSupplierVlaidator} = require("../utils/validators/supplierValidator")
const { createSupplier,getSuppliers,getSupplier,updataSupplier,deleteSupplier} = require("../services/supplierServices");

const router = express.Router();

router.route('/').post(createSupplierValidator,createSupplier).get(getSuppliers);
router.route('/:id').get(getSupplierVlaidator,getSupplier).put(updataSupplierVlaidator,updataSupplier).delete(deleteSupplierVlaidator,deleteSupplier);

module.exports = router;