const mongoose = require('mongoose');
const shareModel = require('../common/shareModel');

const notificationSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    senderId: mongoose.Schema.Types.ObjectId,
    receiverId: mongoose.Schema.Types.ObjectId,
    title: String,
    body: String,
    content: {
        restaurantId: mongoose.Schema.Types.ObjectId,
        restaurantName: String,
        voucherId: mongoose.Schema.Types.ObjectId,
        status: {
            type: String,
            maxLength: 2,
            enum: ['PD', 'AC', 'RJ', 'CC', 'CT', 'CL']
        },
        reservationDetails: shareModel.reservationDetailsModel(),
        userReason: String,
        adminReason: String,
        userToken: String
    },
    type: {
        type: String,
        maxLength: 1,
        enum: ['F', 'G', 'R']
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdTime: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('notifications', notificationSchema);