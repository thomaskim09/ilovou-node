const mongoose = require('mongoose');

const feedbackSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    restaurant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    feedback: {
        profileImage: String,
        userName: String,
        userRated: Number,
        feedbackContent: String,
        feedbackTime: { type: Date, default: Date.now },
        imageUploadeds: [String],
        restaurantReplyStatus: Boolean,
        restaurantReplyContent: String
    },
    modified_date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);