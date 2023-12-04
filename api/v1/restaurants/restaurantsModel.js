const mongoose = require('mongoose');

const restaurantSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  details: {
    restaurantName: String,
    restaurantImage: String,
    restaurantImageList: [String],
    rating: Number,
    restaurantType: mongoose.Schema.Types.ObjectId,
    restriction: String,
    isVegetarian: Boolean,
    routineRestDay: [Number],
    businessHours: [{
      _id: false,
      day: Number,
      section: [{
        _id: false,
        openTime: {
          type: String,
          default: undefined
        },
        closeTime: {
          type: String,
          default: undefined
        }
      }]
    }],
    contact: String,
    address: {
      street: mongoose.Schema.Types.ObjectId,
      area: mongoose.Schema.Types.ObjectId,
      postcode: mongoose.Schema.Types.ObjectId,
      city: mongoose.Schema.Types.ObjectId,
      state: mongoose.Schema.Types.ObjectId
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    fullAddress: String,
    shortAreaName: String,
    place: mongoose.Schema.Types.ObjectId,
    hasMenu: Boolean,
    hasReservation: Boolean
  },
  reservationSettings: {
    hasReservation: Boolean,
    maxReservationDay: Number,
    holidays: [{
      _id: false,
      holidayName: String,
      holidayDate: Date
    }],
    paxSettings: {
      minPax: Number,
      maxPax: Number
    },
    remarkManual: {
      type: Array,
      default: undefined
    },
    noticeContent: String
  },
  searchTags: {
    type: [mongoose.Schema.Types.ObjectId],
    validate: {
      validator: v => v.length <= 5,
      message: 'Search tags must not more than 5 tags.'
    },
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['OP', 'CL', 'HD', 'NV']
  }
});

module.exports = mongoose.model('restaurants', restaurantSchema);