const mongoose = require('mongoose');
const shareModel = require('../common/shareModel');

// Capped Collection
const tempOrderSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    restaurantId: mongoose.Schema.Types.ObjectId,
    fingerprint: String,
    orderDetails: shareModel.orderDetails(),
    billDetails: shareModel.billDetails(),
    responseDetails: shareModel.responseDetails(),
    status: {
        type: String,
        maxLength: 2,
        enum: ['PC', 'PA', 'RJ', 'AC', 'CF', 'CD', 'UC', 'CC', 'OR']
    },
    reason: String,
    isRead: {
        type: Boolean,
        default: false
    },
    createdTime: {
        type: Date,
        index: true,
        expires: 60 * 60 * 12, // 12 hours
        default: Date.now
    }
});

module.exports = mongoose.model('temp_orders', tempOrderSchema);