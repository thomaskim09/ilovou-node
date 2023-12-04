const mongoose = require('mongoose');
const sanitize = require('mongo-sanitize');
const winston = require('../utils/winston');
const feedbacks = require('./feedbacksModel');
const restaurants = require('../restaurants/restaurantsModel');
const tickets = require('../tickets/ticketsModel');
const fcmController = require('../notifications/fcmController');
const errHan = require('../common/errorHandle');
const ticketFun = require('../common/ticketFunction');
const imageHan = require('../common/imageHandle');
const notiCon = require('../notifications/notificationsController');
const comFun = require('../common/commonFunction');
const returnHan = require('../common/returnHandle');

module.exports.get_feedback_count = (req, res, next) => {
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    feedbacks.aggregate([{
            $match: {
                'restaurantId': mongoose.Types.ObjectId(restaurantId),
                'voucherId': { // To trigger compound index
                    $exists: true
                },
                'status': { // To trigger compound index
                    $exists: true
                },
                'isRead': false
            }
        },
        {
            $count: 'count'
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        if (result.length === 0) {
            result = [{
                count: 0
            }];
        }
        return returnHan.success(`GET: (Admin) Feedback count (resId:${restaurantId})`, result, res);
    });
};

module.exports.read_feedback = (req, res, next) => {
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    feedbacks.updateMany({
        'restaurantId': mongoose.Types.ObjectId(restaurantId),
        'voucherId': { // To trigger compound index
            $exists: true
        },
        'status': { // To trigger compound index
            $exists: true
        },
        'isRead': false
    }, {
        $set: {
            'isRead': true
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        if (result.length === 0) {
            result = [{
                count: 0
            }];
        }
        return returnHan.successOnly(`UPDATE: (Admin) Feedback read (resId:${restaurantId})`, res);
    });
};

module.exports.create_feedback = (req, res, next) => {
    const voucherId = req.body.voucherId;
    const ticketId = req.body.ticketId;
    const userId = req.body.userId;
    const username = req.body.username;
    const restaurantId = req.body.restaurantId;
    const voucherName = req.body.voucherName;
    const content = sanitize(req.body.content);
    const rating = req.body.rating;

    if (errHan.missingParams([voucherId, ticketId, userId, username, restaurantId, voucherName], req)) {
        return res.status(404).json();
    }

    // Push firebase notification
    fcmController.push_reservation_fcm(restaurantId, 'F', `${username} has commented`, `on ${voucherName}`);

    // Change ticket status to history
    ticketFun.changeTicketStatus(ticketId, 'HV');

    // Save image to sub domain
    const uploadPhotos = req.body.photos || [];
    const photoList = uploadPhotos.map((val) => {
        if (!imageHan.checkIfUrl(val)) {
            return imageHan.uploadBase64File('fbk', val);
        }
    });

    // Create new feedback
    const feedbackRecord = new feedbacks({
        _id: new mongoose.Types.ObjectId(),
        restaurantId: restaurantId,
        voucherId: voucherId,
        userId: userId,
        details: {
            username: username,
            voucherName: voucherName,
            rating: rating,
            content: comFun.decodeEntities(content),
            photos: photoList
        },
        replyDetails: {
            status: false
        },
        status: 'OP'
    });
    feedbackRecord.save((err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`CREATE: (User) New Feedback (userId:${userId} fbkId:${feedbackRecord._id})`, res);
    });
};

module.exports.cancel_feedback = (req, res, next) => {
    const ticketId = req.query.ticketId;

    if (errHan.missingParams([ticketId], req)) {
        return res.status(404).json();
    }

    ticketFun.changeTicketStatus(ticketId, 'HV', res);
};

module.exports.get_feedbacks = (req, res, next) => {
    const voucherId = req.query.voucherId;
    const restaurantId = req.query.restaurantId;
    // Pagination
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = (pageSize === 10 && pageNum === 1) ? 2 : pageSize * (pageNum - 1);

    if (errHan.missingParams([pageSize, pageNum], req)) {
        return res.status(404).json();
    }

    const defaultValue = { // To trigger compound index
        $exists: true
    };

    const matchQuery = {
        'restaurantId': restaurantId ? mongoose.Types.ObjectId(restaurantId) : defaultValue,
        'voucherId': voucherId ? mongoose.Types.ObjectId(voucherId) : defaultValue,
        'status': 'OP'
    };

    feedbacks.aggregate([{
            $match: matchQuery
        },
        {
            $sort: {
                'details.feedbackTime': -1
            }
        },
        {
            $limit: pageSize + skips
        },
        {
            $skip: skips
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'users'
            }
        },
        {
            $project: {
                'profileImage': {
                    $arrayElemAt: ['$users.details.profileImage', 0]
                },
                'username': '$details.username',
                'rating': '$details.rating',
                'content': '$details.content',
                'feedbackTime': '$details.feedbackTime',
                'photos': '$details.photos',
                'replyStatus': '$replyDetails.status',
                'replyContent': '$replyDetails.replyContent',
                'voucherName': '$details.voucherName'
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        const text = restaurantId ? `resId:${restaurantId}` : `vouId:${voucherId}`;
        return returnHan.success(`GET: (User) Feedback list ${pageSize} ${pageNum} (${text})`, result, res);
    });
};

module.exports.get_feedback_list = (req, res, next) => {
    const restaurantId = req.query.restaurantId;
    // Pagination
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    feedbacks.aggregate([{
            $match: {
                'restaurantId': mongoose.Types.ObjectId(restaurantId),
                'voucherId': { // To trigger compound index
                    $exists: true
                },
                'status': 'OP'
            }
        },
        {
            $sort: {
                'details.feedbackTime': -1
            }
        },
        {
            $limit: pageSize + skips
        },
        {
            $skip: skips
        },
        {
            $project: {
                '_id': 1,
                'username': '$details.username',
                'rating': '$details.rating',
                'content': '$details.content',
                'feedbackTime': '$details.feedbackTime',
                'replyStatus': '$replyDetails.status'
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Feedback list ${pageSize} ${pageNum} (resId:${restaurantId})`, result, res);
    });
};

module.exports.get_feedback_details = (req, res, next) => {
    const feedbackId = req.query.feedbackId;

    if (errHan.missingParams([feedbackId], req)) {
        return res.status(404).json();
    }

    feedbacks.aggregate([{
            $match: {
                '_id': mongoose.Types.ObjectId(feedbackId)
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'users'
            }
        },
        {
            $project: {
                'userId': 1,
                'userToken': {
                    $arrayElemAt: ['$users.deviceDetails.token', 0]
                },
                'username': '$details.username',
                'rating': '$details.rating',
                'content': '$details.content',
                'feedbackTime': '$details.feedbackTime',
                'photos': '$details.photos',
                'replyStatus': '$replyDetails.status',
                'replyContent': '$replyDetails.replyContent',
                'voucherName': '$details.voucherName'
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Feedback details (fbkId:${feedbackId})`, result, res);
    });
};

module.exports.reply_feedback = (req, res, next) => {
    const feedbackId = req.query.feedbackId;
    const content = sanitize(req.body.content);

    if (errHan.missingParams([feedbackId, content.userToken], req)) {
        return res.status(404).json();
    }

    feedbacks.findOneAndUpdate({
        '_id': feedbackId
    }, {
        'replyDetails': {
            'status': true,
            'replyContent': content.reply,
            'replyTime': new Date()
        }
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        // Create common notification
        const notificationObject = {
            senderId: content.senderId,
            receiverId: content.receiverId,
            title: content.title,
            body: content.reply,
            type: 'F'
        };
        notiCon.create_notification(notificationObject);

        // Fcm notification
        const fcmObject = {
            title: content.title,
            body: content.reply,
            type: 'F',
            content: { // To ensure client side no error on JSON.parse
                adminId: content.senderId
            }
        };
        fcmController.fcmPush(content.userToken, fcmObject);

        return returnHan.successOnly(`UPDATE: (Admin) Feedback reply content (fbkId:${feedbackId})`, res);
    });
};

module.exports.check_feedback = (req, res, next) => {
    const ticketId = req.query.ticketId;

    if (errHan.missingParams([ticketId], req)) {
        return res.status(404).json();
    }

    tickets.findOne({
        '_id': ticketId
    }, ['status'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        const re = {
            canFeedback: (result.status === 'PC')
        };
        return returnHan.success(`GET: (User) Check ticket status (tktId:${ticketId})`, re, res);
    });
};

module.exports.calculate_rating = (req, res, next) => {
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    feedbacks.aggregate([{
            $match: {
                'restaurantId': mongoose.Types.ObjectId(restaurantId)
            }
        },
        {
            $sort: {
                'details.feedbackTime': -1
            }
        },
        {
            $limit: 30
        },
        {
            $group: {
                '_id': 'x',
                'averageRating': {
                    $avg: '$details.rating'
                },
                'count': {
                    $sum: 1
                }
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        if (!result) {
            return res.status(200).json();
        }
        if (!result.length) {
            return res.status(200).json();
        }
        if (!result[0].averageRating) {
            return res.status(200).json();
        }
        const total = result[0].count;
        const rating = parseFloat((result[0].averageRating)).toFixed(1);
        winston.info(`GET: (Admin) Restaurant's rating total=${total} rating=${rating} (resId:${restaurantId})`);
        if (!rating) {
            return res.status(200).json();
        }

        restaurants.findOneAndUpdate({
            '_id': restaurantId
        }, {
            'details.rating': rating
        }, {
            projection: {
                '_id': 1
            }
        }, (err1, result1) => {
            if (err1) {
                return errHan.commonError(err1, res);
            }
            return returnHan.successOnly(`UPDATE: (Admin) Restaurant's rating total=${total} rating=${rating} (resId:${restaurantId})`, res);
        });
    });
};