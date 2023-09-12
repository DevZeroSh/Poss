const { check, body, param } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const Customar =require('../../models/customarModel');

//validator for create one customar
exports.createCustomarVlaidator = [
  check("name")
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
    Customar.findOne({ email: val }).then((customar) => {
        if (customar) {
          return Promise.reject(new Error("Email already in customar"));
        }
      })
    ),

  validatorMiddleware,
];

//Validator for update an customar
exports.updataCustomarVlaidator = [

    param("id").isMongoId().withMessage("Invalid customar id"),
    check("name")
        .optional()
        .notEmpty().withMessage("The name can not be empty")
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
        .custom((val,{req}) => Customar.findOne({ email: val, _id: { $ne: req.params.id }}).then((customar) => {
         
            if (customar) {
              return Promise.reject(new Error("Email already in customar"));
            }
        }) 
        ),

    validatorMiddleware,
];

//Validator to id when get one customar
exports.getCustomarVlaidator = [
    check('id').isMongoId().withMessage("Invalid customar id"),
    validatorMiddleware,
];

//Validator to id when delete an customar
exports.deleteCustomarVlaidator = [
    check('id').isMongoId().withMessage("Invalid customar id"),
    validatorMiddleware,
];
