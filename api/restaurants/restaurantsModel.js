const mongoose = require("mongoose");

const restaurantSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  details: {
    restaurantName: {
      type: String,
      required: true
    },
    restaurantProfileImage: String,
    restaurantGallery: [
      {
        categoryId: mongoose.Schema.Types.ObjectId,
        categoryName: String,
        categoryImages: [String]
      }
    ],
    address: {
      street: String,
      area: String,
      postcode: Number,
      city: String,
      state: String,
      country: String
    },
    fullAddress: String,
    shortAreaName: String,
    areaKnownAs: String,
    rating: mongoose.Schema.Types.Decimal128,
    restaurantType: String,
    costPerPax: Number,
    currency: String,
    currencyCode: String,
    routineRestDay: Number,
    businiessHours: [
      {
        day: String,
        openTime: Date,
        closeTime: Date
      }
    ],
    contact: String,
    hasMenu: Boolean,
    hasReservation: Boolean
  },
  vouchers: [
    {
      voucherId: mongoose.Schema.Types.ObjectId,
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
    }
  ],
  reservation: {
    reservationSettings: {
      maxReservationDay: Number,
      holidays: [
        {
          holidayName: String,
          holidayDate: Date
        }
      ],
      paxSettings: {
        minPax: Number,
        maxPax: Number
      }
    },
    reservationDetails: [
      {
        reservationId: mongoose.Schema.Types.ObjectId,
        userId: mongoose.Schema.Types.ObjectId,
        reservationDate: Date,
        reservationTime: Date,
        dinningPax: Number,
        dinningArea: String,
        remark: String, // (optional)
        isReservationAccepted: Boolean
      }
    ]
  },
  // feedBack: [{
  //     userId: String,
  //     profileImage: String,
  //     userName: String,
  //     userRated: Number,
  //     feedbackContent: String,
  //     feedbackTime: Date,
  //     imageUploadeds: [String],
  //     restaurantReplyStatus: Boolean,
  //     restaurantReplyContent: String
  // }],
  searchTags: [mongoose.Schema.Types.ObjectId]
});

module.exports = mongoose.model("Restaurant", restaurantSchema);
