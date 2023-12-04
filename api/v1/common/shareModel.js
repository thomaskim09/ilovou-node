const mongoose = require('mongoose');

module.exports.menuSettingsModel = () => ({
  hasMenu: Boolean,
  commonDetails: {
    hasTranslation: Boolean,
    hasCallService: Boolean,
    hasPayCounter: Boolean,
    hasNotifyService: Boolean,
    hasHideTotal: Boolean
  },
  modeDetails: {
    orderMode: String,
    displayMode: String
  },
  totalDetails: {
    hasTax: Boolean,
    taxPercentage: Number,
    hasServiceCharge: Boolean,
    serviceChargePercentage: Number,
    hasTakeAway: Boolean,
    hasTakeAwayFee: Boolean,
    hasTakeAwayPerPackage: Boolean,
    takeAwayFee: Number
  },
  securityDetails: {
    hasTableNoLock: Boolean,
    hasTableNoRange: Boolean,
    tableNoRange: Number
  },
  noticeDetails: {
    hasNotice: Boolean,
    noticeTitle: String,
    noticeTitleTranslated: String,
    noticeContent: String,
    noticeContentTranslated: String
  }
});

module.exports.menuSettingsOrdersModel = () => ({
  modeDetails: {
    displayMode: String
  },
  totalDetails: {
    hasTax: Boolean,
    taxPercentage: Number,
    hasServiceCharge: Boolean,
    serviceChargePercentage: Number,
    hasTakeAway: Boolean,
    hasTakeAwayFee: Boolean,
    hasTakeAwayPerPackage: Boolean,
    takeAwayFee: Number
  }
});

module.exports.orderDetails = () => ([{
  _id: false,
  itemName: String,
  itemShortName: String,
  itemCode: String,
  itemPrice: Number,
  quantity: Number,
  needTakeAway: Boolean,
  remarkObject: {
    type: Array,
    default: undefined
  },
  extraRemark: String
}]);

module.exports.billDetails = () => ({
  userToken: String,
  username: String,
  contact: String,
  isDineIn: Boolean,
  needTakeAway: Boolean,
  collectTime: String,
  tableNo: String,
  subTotal: Number,
  taxCharge: Number,
  serviceCharge: Number,
  packagingFee: Number,
  roundingType: String,
  roundingAdjustment: Number,
  totalPrice: Number
});

module.exports.responseDetails = () => ({
  description: String,
  amountType: String,
  amountPrice: Number,
  subTotal: Number,
  taxCharge: Number,
  serviceCharge: Number,
  packagingFee: Number,
  roundingType: String,
  roundingAdjustment: Number,
  totalPrice: Number
});

module.exports.userDeviceDetailsModel = () => ({
  token: String,
  fingerprint: String,
  details: {
    browser: String,
    os: String,
    osVersion: String,
    deviceType: String,
    isMobile: Boolean
  }
});

module.exports.adminDeviceDetailsModel = () => ([{
  _id: false,
  token: String,
  fingerprint: String
}]);


module.exports.reservationDetailsModel = () => ({
  name: String,
  contact: String,
  dateTime: Date,
  pax: Number,
  remark: String,
  extraRemark: Array,
  notificationId: mongoose.Schema.Types.ObjectId
});

module.exports.usageDetailsModel = () => ({
  claimed: {
    type: Number,
    default: 0
  },
  claimTime: {
    type: Array,
    default: undefined
  }
});