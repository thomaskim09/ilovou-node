const mongoose = require('mongoose');

const adsSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    tags: {
        type: Array,
        default: undefined
    },
    restaurants: {
        type: Array,
        default: undefined
    },
    vouchers: {
        type: Array,
        default: undefined
    }
});

module.exports = mongoose.model('ads', adsSchema);