const mongoose = require('mongoose');

const treatSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    senderDetails: {
        senderId: mongoose.Schema.Types.ObjectId,
        senderType: String
    },
    details: {
        email: String,
        content: String,
        amount: Number,
        treatType: String,
        paymentMethod: String,
        isAnonymous: Boolean
    },
    createdTime: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('treats', treatSchema);