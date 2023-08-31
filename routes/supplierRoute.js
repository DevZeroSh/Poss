const express = require("express");

const { createSupplier,getSuppliers,getSupplier,updataSupplier,deleteSupplier} = require("../services/supplierServices");

const router = express.Router();

router.route('/').post(createSupplier).get(getSuppliers);
router.route('/:id').get(getSupplier).put(updataSupplier).delete(deleteSupplier);

module.exports = router;