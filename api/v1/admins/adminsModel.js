const mongoose = require('mongoose');
const shareModel = require('../common/shareModel');

const adminSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    restaurantId: mongoose.Schema.Types.ObjectId,
    restaurantList: [mongoose.Schema.Types.ObjectId],
    details: {
        username: {
            type: String,
            trim: true,
            lowercase: true,
            maxLength: 15,
            required: true
        },
        password: {
            type: String,
            trim: true,
            maxLength: 15,
            required: true
        }
    },
    companyDetails: {
        companyName: String,
        registrationNo: String,
        sstId: String,
        contact: String,
        email: String,
        address: String,
        bankType: String,
        bankAccountName: String,
        bankAccountNumber: String
    },
    deviceDetails: shareModel.adminDeviceDetailsModel(),
    status: {
        type: String,
        enum: ['OP', 'CL', 'HD']
    },
    packageDetails: {
        subscription: {
            type: String,
            enum: ['01', '02', '03']
        },
        feature: {
            type: String,
            enum: ['1', '3']
        }
    },
    lastLogin: Date,
    createdTime: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('admins', adminSchema);