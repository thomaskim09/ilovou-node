const bcrypt = require('bcrypt');
const sanitize = require('mongo-sanitize');
const mongoose = require('mongoose');
const winston = require('../utils/winston');
const users = require('./usersModel');
const restaurants = require('../restaurants/restaurantsModel');
const fcmController = require('../notifications/fcmController');
const errHan = require('../common/errorHandle');
const imageHan = require('../common/imageHandle');
const comFun = require('../common/commonFunction');
const returnHan = require('../common/returnHandle');

/*
Status type
OP - Open
CL - Closed
*/

module.exports.sign_up = (req, res, next) => {
    const contact = sanitize(req.body.contact);
    const username = sanitize(req.body.username);
    const password = sanitize(req.body.password);
    const email = sanitize(req.body.email);
    const token = req.body.token;
    const fingerprint = req.body.fingerprint;
    const details = req.body.details;

    if (errHan.missingParams([contact, username, password], req)) {
        return res.status(404).json();
    }

    function denied(text, message) {
        winston.error(text);
        return res.status(404).json({
            error: message
        });
    }

    users.find({
        'details.contact': contact
    }, (err, result) => {
        if (err) {
            return denied(err, 'Authentication failed');
        }
        winston.info(`GET: (User) User details (contact:${contact} username:${username})`);

        if (result.length >= 1) {
            return denied(`Error: Contact already taken (contact:${contact} username:${username})`, 'Contact already taken.');
        }
        bcrypt.hash(password, 10, (err1, hash) => {
            if (err1) {
                return denied(`Error: Error when hashing the password (contact:${contact} username:${username})`, 'Authentication failed');
            }

            const userRecord = new users({
                _id: new mongoose.Types.ObjectId(),
                details: {
                    contact: contact,
                    password: hash,
                    username: username,
                    email: email,
                    favourites: []
                },
                status: 'OP',
                deviceDetails: {
                    token: token,
                    fingerprint: fingerprint,
                    details: details
                },
                lastLogin: new Date()
            });

            userRecord.save((err2, result1) => {
                if (err2) {
                    return res.status(500).json(err2);
                }
                const final = {
                    _id: result1._id,
                    contact: result1.details.contact,
                    username: result1.details.username,
                    email: result1.details.email,
                    favourites: result1.details.favourites,
                    token: result1.deviceDetails.token,
                    createdTime: result1.createdTime
                };
                return returnHan.success(`CREATE: (User) New user (userId:${final._id} contact:${contact} username:${final.username})`, final, res);
            });
        });
    });
};

function updateUserLoginTime(contact, result, res, type, token, fingerprint, details) {
    // Save device token to user
    if (token && token !== result.deviceDetails.token) {
        fcmController.register_user_fcm_device(result._id, token, fingerprint, details);
    }

    users.findOneAndUpdate({
        'details.contact': contact
    }, {
        'lastLogin': new Date()
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result2) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        const final = {
            _id: result._id,
            contact: result.details.contact,
            username: result.details.username,
            profileImage: result.details.profileImage,
            email: result.details.email,
            favourites: result.details.favourites,
            token: token || result.deviceDetails.token,
            createdTime: result.createdTime
        };

        return returnHan.success(`UPDATE: (User) User ${type} login (userId:${final._id} username:${final.username})`, final, res);
    });
}


module.exports.login = (req, res, next) => {
    const type = req.query.type;
    const contact = sanitize(req.body.contact);
    const password = sanitize(req.body.password);
    const token = req.body.token;
    const fingerprint = req.body.fingerprint;
    const details = req.body.details;

    if (errHan.missingParams([type, contact], req)) {
        return res.status(404).json();
    }

    function denied(text, message) {
        winston.error(text);
        return res.status(404).json({
            error: message
        });
    }

    users.findOne({
        'details.contact': contact,
        'status': 'OP'
    }, [
        'details',
        'deviceDetails',
        'createdTime'
    ], (err, result) => {
        if (err) {
            return denied(err, 'Authentication failed');
        }
        if (result === null) {
            return denied(`ERROR: Login failed - No contact found (contact: ${contact})`, 'Authentication failed');
        }
        if (result.length < 1) {
            return denied(`ERROR: Login failed - No contact found (contact: ${contact})`, 'Authentication failed');
        }
        winston.info(`GET: (User) User details during login (contact:${contact})`);

        if (type === 'password') {
            if (errHan.missingParams([password], req)) {
                return res.status(404).json();
            }
            bcrypt.compare(password, result.details.password, (err1, result1) => {
                if (err1) {
                    return denied(err1, 'Authentication failed');
                }
                if (result1 === false) {
                    return denied(`ERROR: Login failed - Incorrect Password (contact:${contact})`, 'Authentication failed');
                }
                if (result1 === true) {
                    updateUserLoginTime(contact, result, res, 'password', token, fingerprint, details);
                }
            });
        } else if (type === 'otp') {
            updateUserLoginTime(contact, result, res, 'otp', token, fingerprint, details);
        }
    });
};

module.exports.check_username = (req, res, next) => {
    const username = req.body.username;

    if (errHan.missingParams([username], req)) {
        return res.status(404).json();
    }

    users.find({
        'details.username': username
    }, ['details.username'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`CHECK: (User) Username existence (user_search:${username})`, result, res);
    });
};

module.exports.check_contact = (req, res, next) => {
    const contact = req.body.contact;

    if (errHan.missingParams([contact], req)) {
        return res.status(404).json();
    }

    users.find({
        'details.contact': contact
    }, ['details.contact'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`CHECK: Contact existence (contact:${contact})`, result, res);
    });
};

module.exports.update_password = (req, res, next) => {
    const contact = sanitize(req.body.contact);
    const newPassword = sanitize(req.body.newPassword);

    if (errHan.missingParams([contact, newPassword], req)) {
        return res.status(404).json();
    }

    bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        users.findOneAndUpdate({
            'details.contact': contact
        }, {
            'details.password': hash
        }, {
            projection: {
                '_id': 1
            }
        }, (err1, result) => {
            if (err1) {
                return errHan.commonError(err1, res);
            }
            return returnHan.successOnly(`UPDATE: (User) Password updated (contact:${contact})`, res);
        });
    });
};

module.exports.get_favourites = (req, res, next) => {
    const objectIdList = comFun.convertArrayToObjectId(req.body.idList);

    if (errHan.missingParams([objectIdList], req)) {
        return res.status(404).json();
    }

    restaurants.aggregate([{
            $match: {
                '_id': {
                    $in: objectIdList
                }
            }
        },
        {
            $lookup: {
                from: 'tags',
                let: {
                    'restaurantType': '$details.restaurantType'
                },
                pipeline: [{
                        $match: {
                            $expr: {
                                $in: ['$$restaurantType', '$details.restaurantTypes._id']
                            }
                        }
                    },
                    {
                        $unwind: '$details.restaurantTypes'
                    },
                    {
                        $match: {
                            $expr: {
                                $eq: ['$details.restaurantTypes._id', '$$restaurantType']
                            }
                        }
                    }
                ],
                as: 'types'
            }
        },
        {
            $project: {
                'restaurantImage': '$details.restaurantImage',
                'restaurantName': '$details.restaurantName',
                'restaurantType': {
                    $arrayElemAt: ['$types.details.restaurantTypes.name', 0]
                },
                'rating': '$details.rating',
                'status': '$status'
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (User) Favourite restaurants`, result, res);
    });
};

module.exports.add_favourites = (req, res, next) => {
    const userId = req.query.userId;
    const restaurantId = req.body.restaurantId;

    if (errHan.missingParams([userId, restaurantId], req)) {
        return res.status(404).json();
    }

    users.findOneAndUpdate({
        '_id': userId
    }, {
        $push: {
            'details.favourites': restaurantId
        }
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (User) Favourite added (userId:${userId})`, res);
    });
};

module.exports.remove_favourites = (req, res, next) => {
    const userId = req.query.userId;
    const restaurantId = req.body.restaurantId;

    if (errHan.missingParams([userId, restaurantId], req)) {
        return res.status(404).json();
    }

    users.findOneAndUpdate({
        '_id': userId
    }, {
        $pull: {
            'details.favourites': restaurantId
        }
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (User) Favourite removed (userId:${userId})`, res);
    });
};

module.exports.update_user_image = (req, res, next) => {
    const userId = req.body.userId;
    let image = req.body.image;

    if (errHan.missingParams([userId, image], req)) {
        return res.status(404).json();
    }

    // Save image to sub domain
    if (!imageHan.checkIfUrl(image)) {
        image = imageHan.uploadBase64File('usr', image);
    }

    users.findOneAndUpdate({
        '_id': userId
    }, {
        'details.profileImage': image
    }, {
        projection: {
            '_id': 1,
            'details.profileImage': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        // Delete previous image from sub domain
        if (imageHan.checkIfUrl(result.details.profileImage)) {
            imageHan.deleteFile(result.details.profileImage);
        }

        return returnHan.successOnly(`UPDATE: (User) User image (userId:${userId})`, res);
    });
};

module.exports.update_user_email = (req, res, next) => {
    const userId = req.body.userId;
    const email = req.body.email;

    if (errHan.missingParams([userId, email], req)) {
        return res.status(404).json();
    }

    users.findOneAndUpdate({
        '_id': userId
    }, {
        'details.email': email
    }, {
        projection: {
            '_id': 1,
            'details.email': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        return returnHan.successOnly(`UPDATE: (User) User email (userId:${userId})`, res);
    });
};