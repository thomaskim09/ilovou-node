const mongoose = require('mongoose');
const shareModel = require('../common/shareModel');

const orderSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    restaurantId: mongoose.Schema.Types.ObjectId,
    fingerprint: String,
    orderDetails: shareModel.orderDetails(),
    billDetails: shareModel.billDetails(),
    responseDetails: shareModel.responseDetails(),
    menuSettings: shareModel.menuSettingsOrdersModel(),
    createdTime: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('orders', orderSchema);