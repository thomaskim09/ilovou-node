const mongoose = require('mongoose');
const shareModel = require('../common/shareModel');

const ticketReservationSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    voucherId: mongoose.Schema.Types.ObjectId,
    restaurantId: mongoose.Schema.Types.ObjectId,
    ticketCode: String,
    reservationDetails: shareModel.reservationDetailsModel(),
    expiredDate: Date,
    status: {
        type: String,
        maxLength: 2,
        required: true,
        enum: ['RE', 'HR']
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

module.exports = mongoose.model('tickets_reservation', ticketReservationSchema);