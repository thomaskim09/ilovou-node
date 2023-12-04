const mongoose = require('mongoose');

const voucherSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  restaurantId: mongoose.Schema.Types.ObjectId,
  restaurantList: [mongoose.Schema.Types.ObjectId],
  details: {
    voucherName: String,
    voucherImage: String,
    voucherType: String,
    newPrice: Number,
    basePrice: Number,
    quantitySold: {
      type: Number,
      default: 0
    },
    voucherRules: {
      validFrom: Date,
      validUntil: Date,
      startTime: String,
      endTime: String,
      ruleDetails: [String],
      customRuleDetails: [String]
    },
    // Limit controls
    limitedQuantity: Number,
    soldOutTime: Date,
    limitedQuantityPerUser: Number,
    userPurchaseHistory: {
      type: Array,
      default: undefined
    },
    limitedEndTime: Date,
    startSellingTime: Date,
    // Group details
    groupVoucherDetails: {
      type: Array,
      default: undefined
    },
    // Set voucher
    suitablePax: Number,
    setDetails: {
      type: Array,
      default: undefined
    },
    // Cash voucher
    minimumSpend: Number,
    // Quantity voucher
    quantityUnit: Number,
    quantityDetails: {
      type: Array,
      default: undefined
    },
    // Monthly voucher
    limitPerDay: Number,
    monthlyDetails: {
      type: Array,
      default: undefined
    }
  },
  status: {
    type: String,
    require: true,
    enum: ['OP', 'HD', 'SO', 'WG', 'CL']
  },
  order: Number,
  createdTime: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('vouchers', voucherSchema);