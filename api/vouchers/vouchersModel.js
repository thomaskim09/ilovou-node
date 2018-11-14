const mongoose = require("mongoose");

const restaurantSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  voucherImage: String,
  voucherName: String,
  voucherType: String,
  suitablePax: Number,
  newPrice: mongoose.Schema.Types.Decimal128,
  basePrice: mongoose.Schema.Types.Decimal128,
  quantitySold: Number,
  limitedQuantity: Number, // (optional)
  soldOutTime: Date, // (optional) sold out time comes with the limited quantity
  limitQuantityPerUser: Number, //(optional)
  userReachedLimitQuantity: [
    // User who exceed max quantity, will not view the voucher in voucher page
    {
      userId: String,
      quantityBrought: Number
    }
  ],
  limitedEndTime: Date, //(optional)
  grabStartTime: Date, //(optional)
  groupVoucherDetails: [
    {
      groupQuantity: Number,
      groupPricePerUnit: mongoose.Schema.Types.Decimal128
    }
  ],
  quantityDetails: [
    {
      // This field is for Quantity Voucher
      quantityTitle: String,
      quantityContents: [
        {
          itemName: String,
          itemNewPrice: mongoose.Schema.Types.Decimal128,
          itemPreviousPrice: mongoose.Schema.Types.Decimal128
        }
      ]
    }
  ],
  setDetails: [
    {
      setTitle: String,
      setContents: [
        {
          setName: String,
          setUnit: Number,
          setPrice: mongoose.Schema.Types.Decimal128
        }
      ]
    }
  ],
  voucherRules: {
    validFrom: Date,
    validUntil: Date,
    startHour: Date,
    endHour: Date,
    ruleDetails: [String]
  },
  status: String
});

module.exports = mongoose.model("Restaurant", restaurantSchema);
