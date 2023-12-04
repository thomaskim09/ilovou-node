const mongoose = require('mongoose');
const shareModel = require('../common/shareModel');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    details: {
        contact: String,
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
        },
        email: String,
        profileImage: String,
        favourites: [mongoose.Schema.Types.ObjectId]
    },
    deviceDetails: shareModel.userDeviceDetailsModel(),
    status: {
        type: String,
        maxLength: 2,
        required: true,
        enum: ['OP', 'CL']
    },
    lastLogin: Date,
    createdTime: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('users', userSchema);