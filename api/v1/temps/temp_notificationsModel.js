const mongoose = require('mongoose');

const tempNotificationSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    senderId: mongoose.Schema.Types.ObjectId,
    receiverId: mongoose.Schema.Types.ObjectId,
    fingerprint: String,
    title: String,
    body: String,
    content: {
        reason: String
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdTime: {
        type: Date,
        index: true,
        expires: 60 * 60, // 1 hour
        default: Date.now
    }
});

module.exports = mongoose.model('temp_notifications', tempNotificationSchema);