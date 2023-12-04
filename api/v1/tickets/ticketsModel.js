const mongoose = require('mongoose');
const shareModel = require('../common/shareModel');

const ticketSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    voucherId: mongoose.Schema.Types.ObjectId,
    restaurantId: mongoose.Schema.Types.ObjectId,
    restaurantList: [mongoose.Schema.Types.ObjectId],
    ticketCode: String,
    purchaseDetails: {
        purchaseTime: Date,
        paymentMethod: String,
        pricePerUnit: Number,
        paymentOffer: Number,
        quantity: Number,
        username: String,
        monthlyExpiryDate: Date
    },
    voucherDetails: {
        voucherImage: String,
        voucherName: String,
        newPrice: Number,
        basePrice: Number,
        validUntil: Date,
        quantityUnit: Number,
        limitPerDay: Number,
        minimumSpend: Number
    },
    usageDetails: shareModel.usageDetailsModel(),
    expiredDate: Date,
    status: {
        type: String,
        maxLength: 2,
        required: true,
        enum: ['PU', 'PC', 'HV']
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isAdminRead: {
        type: Boolean,
        default: false
    },
    createdTime: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('tickets', ticketSchema);