const mongoose = require('mongoose');

const tagsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  details: {
    restaurantTypes: [{
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      counter: Number
    }],
    foodTypes: [{
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      counter: Number
    }]
  }
});

module.exports = mongoose.model('tags', tagsSchema);