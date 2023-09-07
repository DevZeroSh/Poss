const { check, body, param } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const Supplier = require("../../models/suppliersModel");

//validator for create one supplier
exports.createSupplierValidator = [
  check("supplierName")
    .notEmpty()
    .withMessage("The name can not be empty")
    .isLength({ min: 3 })
    .withMessage("The name is too short")
    .isLength({ max: 30 })
    .withMessage("The name is too long"),
  check("phoneNumber")
    .optional()
    .isMobilePhone(["tr-TR"])
    .withMessage("Invalid phone number Only accepted turkey phone numbers"),
  check("email")
    .notEmpty()
    .withMessage("The email can not be empty")
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val) =>
      Supplier.findOne({ email: val }).then((supplier) => {
        if (supplier) {
          return Promise.reject(new Error("Email already in supplier"));
        }
      })
    ),

  validatorMiddleware,
];

//Validator for update an supplier
exports.updataSupplierVlaidator = [
  param("id").isMongoId().withMessage("Invalid supplier id"),
  check("name")
    .optional()
    .notEmpty()
    .withMessage("The name can not be empty")
    .isLength({ min: 3 })
    .withMessage("The name is too short")
    .isLength({ max: 30 })
    .withMessage("The name is too long"),
  check("phoneNumber")
    .optional()
    .isMobilePhone(["tr-TR"])
    .withMessage("Invalid phone number Only accepted turkey phone numbers"),
  body("email")
    .optional()
    .notEmpty()
    .withMessage("The email can not be empty")
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val, { req }) =>
      Supplier.findOne({ email: val, _id: { $ne: req.params.id } }).then(
        (supplier) => {
          if (supplier) {
            return Promise.reject(new Error("Email already in supplier"));
          }
        }
      )
    ),

  validatorMiddleware,
];

//Validator to id when get one supplier
exports.getSupplierVlaidator = [
    check('id').isMongoId().withMessage("Invalid supplier id"),
    validatorMiddleware,
];

//Validator to id when delete one supplier
exports.deleteSupplierVlaidator = [
    check('id').isMongoId().withMessage("Invalid supplier id"),
    validatorMiddleware,
];


