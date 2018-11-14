const mongoose = require("mongoose");

const restaurantSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  details: {
    restaurantName: {
      type: String,
      required: true
    },
    urlSlug: String,
    hashId: String,
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
  vouchers: [mongoose.Schema.Types.ObjectId],
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
    reservationDetails: [mongoose.Schema.Types.ObjectId]
  },
  searchTags: [mongoose.Schema.Types.ObjectId]
});

module.exports = mongoose.model("Restaurant", restaurantSchema);
