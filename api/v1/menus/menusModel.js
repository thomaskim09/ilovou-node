const mongoose = require('mongoose');
const shareModel = require('../common/shareModel');

const menuSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    restaurantId: mongoose.Schema.Types.ObjectId,
    restaurantList: [mongoose.Schema.Types.ObjectId],
    menuSettings: shareModel.menuSettingsModel(),
    categoryDetails: [{
        _id: mongoose.Schema.Types.ObjectId,
        categoryName: String,
        categoryNameTranslated: String,
        limitedTimeSection: {
            startSection: String,
            endSection: String
        },
        order: Number,
        status: String
    }],
    itemDetails: [{
        _id: mongoose.Schema.Types.ObjectId,
        categoryId: mongoose.Schema.Types.ObjectId,
        itemName: String,
        itemNameTranslated: String,
        itemImage: String,
        itemShortName: String,
        itemCode: String,
        itemPrice: Number,
        limitedTimeSection: {
            startSection: String,
            endSection: String
        },
        details: {
            needRemark: Boolean,
            description: String,
            descriptionTranslated: String,
            remarkAuto: {
                type: Array,
                default: undefined
            },
            remarkManual: {
                type: Array,
                default: undefined
            }
        },
        order: Number,
        status: String
    }],
    remarkShortCuts: {
        type: Array,
        default: undefined
    },
    status: {
        type: String,
        maxLength: 2,
        require: true,
        enum: ['OP', 'CL', 'HD']
    }
});

module.exports = mongoose.model('menus', menuSchema);