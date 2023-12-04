const mongoose = require('mongoose');

const feedbackSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  restaurantId: mongoose.Schema.Types.ObjectId,
  voucherId: mongoose.Schema.Types.ObjectId,
  userId: mongoose.Schema.Types.ObjectId,
  details: {
    username: String,
    voucherName: String,
    rating: String,
    content: String,
    photos: [String],
    feedbackTime: {
      type: Date,
      default: Date.now
    }
  },
  replyDetails: {
    status: Boolean,
    replyContent: String,
    replyTime: Date
  },
  status: String,
  isRead: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('feedbacks', feedbackSchema);