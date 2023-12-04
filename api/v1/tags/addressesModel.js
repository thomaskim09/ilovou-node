const mongoose = require('mongoose');

const addressTagsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  state: String,
  cities: [{
    _id: mongoose.Schema.Types.ObjectId,
    city: String,
    shortName: String,
    isDefault: Boolean,
    location: {
      latitude: Number,
      longitude: Number
    },
    postcodes: [{
      _id: mongoose.Schema.Types.ObjectId,
      postcode: String,
      areas: [{
        _id: mongoose.Schema.Types.ObjectId,
        area: String,
        streets: [{
          _id: mongoose.Schema.Types.ObjectId,
          street: String
        }],
        places: [{
          _id: mongoose.Schema.Types.ObjectId,
          place: String
        }]
      }]
    }]
  }]
});

module.exports = mongoose.model('addresses', addressTagsSchema);