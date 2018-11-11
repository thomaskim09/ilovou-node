const mongoose = require('mongoose');

const restaurantSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    details: {
        restaurantName: { type: String, required: true },
        address: {
            city: String,
            postcode: Number,
            state: String
        },
        fullAddress: String,
        shortAreaName: String,
        restaurantImage: String,
        rating: mongoose.Schema.Types.Decimal128,
        restaurantType: String,
        costPerPax: Number,
        currency: String,
        shopOpenTime: String,
        shopCloseTime: String,
        contact: String,
        hasMenu: Boolean,
        hasReservation: Boolean,
    },
    vouchers: [{
        voucherId: mongoose.Schema.Types.ObjectId,
        voucherImage: String,
        voucherName: String,
        areaAvailable: String,
        restaurantArea: String,
        newPrice: mongoose.Schema.Types.Decimal128,
        basePrice: mongoose.Schema.Types.Decimal128,
        suitablePax: Number, // (optional)
        quantitySold: Number,
        limitedQuantity: Number, // (optional)
        soldOutTime: Date, // (optional) sold out time comes with the limited quantity
        limitQuantityPerUser: Number, //(optional)
        userReachedLimitQuantity: [ // User who exceed max quantity, will not view the voucher in voucher page
            {
                userId: String,
                quantityBrought: Number
            }
        ],
        limitedEndTime: Date, //(optional)
        grabStartTime: Date, //(optional)
        groupVoucherDetails: [{
            groupQuantity: Number,
            groupPricePerUnit: mongoose.Schema.Types.Decimal128
        }],
        quantityDetails: { // This field is for Quantity Voucher
            title: String,
            contents: [{
                itemName: String,
                itemNewPrice: mongoose.Schema.Types.Decimal128,
                itemPreviousPrice: mongoose.Schema.Types.Decimal128
            }]
        },
        mealDetails: [{
            mealTitle: String,
            mealContents: [{
                mealName: String,
                mealUnit: Number,
                mealPrice: Number
            }]
        }],
        voucherRules: {
            validFrom: Date,
            validUntil: Date,
            startHour: String,
            endHour: String,
            ruleDetails: [String]
        },
        status: String
    }],
    // feedBack: [{
    //     userId: String,
    //     profileImage: String,
    //     userName: String,
    //     userRated: Number,
    //     feedbackContent: String,
    //     feedbackTime: Date,
    //     imageUploadeds: [String],
    //     restaurantReplyStatus: Boolean,
    //     restaurantReplyContent: String
    // }],
    searchTags: [String]
});

module.exports = mongoose.model('Restaurant', restaurantSchema);