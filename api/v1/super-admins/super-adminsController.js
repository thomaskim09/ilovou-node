const mongoose = require('mongoose');
const winston = require('../utils/winston');
const admins = require('../admins/adminsModel');
const feedbacks = require('../feedbacks/feedbacksModel');
const restaurants = require('../restaurants/restaurantsModel');
const tickets = require('../tickets/ticketsModel');
const treats = require('../treats/treatsModel');
const users = require('../users/usersModel');
const orders = require('../orders/ordersModel');
const vouchers = require('../vouchers/vouchersModel');
const errHan = require('../common/errorHandle');
const comFun = require('../common/commonFunction');
const returnHan = require('../common/returnHandle');
const fcmController = require('../notifications/fcmController');

// Internal file function start
module.exports.updateCollectionStatus = (col, id, status, type, res) => {
    col.findOneAndUpdate({
        '_id': id
    }, {
        'status': status
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`UPDATE: (Super Admin) ${type} status to ${status} (id:${id})`);
        if (res) {
            return res.status(200).json();
        }
    });
};
// Internal file function end

module.exports.get_voucher_list = (req, res, next) => {
    const restaurantId = req.query.restaurantId;
    const statusType = req.query.statusType;

    if (errHan.missingParams([restaurantId, statusType], req)) {
        return res.status(404).json();
    }

    let statusQuery;
    if (statusType === 'active') {
        statusQuery = {
            $ne: 'CL'
        };
    } else if (statusType === 'history') {
        statusQuery = {
            $eq: 'CL'
        };
    }

    vouchers.find({
        'restaurantList': restaurantId,
        'status': statusQuery
    }, [
        'details.voucherName',
        'status'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Super Admin) Voucher List (resId:${restaurantId})`, result, res);
    });
};

module.exports.update_res_vou_status = (req, res, next) => {
    const type = req.query.type;
    const id = req.query.id;
    const status = req.body.status;

    if (errHan.missingParams([type, id, status], req)) {
        return res.status(404).json();
    }

    if (type === 'restaurant') {
        this.updateCollectionStatus(restaurants, id, status, 'Restaurant', res);
    } else {
        this.updateCollectionStatus(vouchers, id, status, 'Voucher', res);
    }
};

module.exports.update_rating = (req, res, next) => {
    const restaurantId = req.body.restaurantId;
    const rating = req.body.rating;

    if (errHan.missingParams([restaurantId, rating], req)) {
        return res.status(404).json();
    }

    restaurants.findOneAndUpdate({
        '_id': restaurantId
    }, {
        'details.rating': rating
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Super Admin) Restaurant's rating (resId:${restaurantId})`, res);
    });
};

module.exports.recalculate_rating = (req, res, next) => {
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;

    if (errHan.missingParams([startDate, endDate], req)) {
        return res.status(404).json();
    }

    let matchQuery = {}; // '{}' to search all for default
    if (startDate && endDate) {
        matchQuery = {
            'details.feedbackTime': {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };
    }

    feedbacks.aggregate([{
            $match: matchQuery
        },
        {
            $group: {
                '_id': '$restaurantId',
                'averageRating': {
                    $avg: '$details.rating'
                }
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        if (result.length === 0) {
            return errHan.commonError('No feedback result found for rating calculation', res);
        }
        winston.info('GET: (Super Admin) Every restaurant\'s rating');

        const bulkOps = [];
        let searchQuery;
        let updateQuery;
        result.map((val) => {
            searchQuery = {
                '_id': mongoose.Types.ObjectId(val._id)
            };
            updateQuery = {
                $set: {
                    'details.rating': parseFloat((val.averageRating).toFixed(1))
                }
            };
            const upsertDoc = {
                'updateOne': {
                    'filter': searchQuery,
                    'update': updateQuery
                }
            };
            bulkOps.push(upsertDoc);
            return val;
        });

        restaurants.collection.bulkWrite(bulkOps)
            .then(result1 => returnHan.success(`BULK UPDATE: (Admin) Restaurant rating`, result, res))
            .catch(err1 => errHan.commonError(err, res));
    });
};

module.exports.get_user_list = (req, res, next) => {
    users.find({}, ['details.username', 'status'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Super Admin) User list`, result, res);
    });
};

module.exports.update_user_status = (req, res, next) => {
    const userId = req.body.userId;
    const status = req.body.status;

    if (errHan.missingParams([userId, status], req)) {
        return res.status(404).json();
    }

    this.updateCollectionStatus(users, userId, status, 'User', res);
};

module.exports.search_collection = (req, res, next) => {
    const collectionType = req.query.collectionType;
    const type = req.query.type;
    const objectId = req.body.objectId;
    const query = req.body.query;
    const fieldsNeeded = req.body.fields;

    if (errHan.missingParams([type, fieldsNeeded], req)) {
        return res.status(404).json();
    }

    let searchQuery;
    if (type === 'id') {
        searchQuery = {
            '_id': objectId
        };
    } else {
        searchQuery = JSON.parse(query);
    }

    let collection;
    switch (collectionType) {
        case 'restaurants':
            collection = restaurants;
            break;
        case 'vouchers':
            collection = vouchers;
            break;
        case 'admins':
            collection = admins;
            break;
        case 'users':
            collection = users;
            break;
        case 'tickets':
            collection = tickets;
            break;
        case 'orders':
            collection = orders;
            break;
        case 'feedbacks':
            collection = feedbacks;
            break;
        default:
            break;
    }

    collection.findOne(searchQuery, fieldsNeeded, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Super Admin) Search ${type} for details`, result, res);
    });
};

module.exports.mass_settlement = (req, res, next) => {
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    if (errHan.missingParams([startDate, endDate], req)) {
        return res.status(404).json();
    }

    // Search admins collection
    admins.aggregate([{
        $lookup: {
            from: 'restaurants',
            localField: 'restaurantId',
            foreignField: '_id',
            as: 'restaurants'
        }
    }, {
        $project: {
            'status': 1,
            'feature': '$packageDetails.feature',
            'subscription': '$packageDetails.subscription',
            'restaurantId': '$restaurantId',
            'companyName': '$companyDetails.companyName',
            'email': '$companyDetails.email',
            'bankType': '$companyDetails.bankType',
            'bankAccountName': '$companyDetails.bankAccountName',
            'bankAccountNumber': '$companyDetails.bankAccountNumber',
            'restaurantName': {
                $arrayElemAt: ['$restaurants.details.restaurantName', 0]
            }
        }
    }], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`GET: (Super Admin) All Admin list during mass settlement`);

        // Search tickets collection
        tickets.aggregate([{
            $match: {
                'purchaseDetails.purchaseTime': {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }
        }, {
            $project: {
                'restaurantId': '$restaurantId',
                'quantity': '$purchaseDetails.quantity',
                'pricePerUnit': '$purchaseDetails.pricePerUnit',
                'voucherName': '$voucherDetails.voucherName',
                'purchaseTime': '$purchaseDetails.purchaseTime',
                'paymentMethod': '$purchaseDetails.paymentMethod',
                'paymentOffer': '$purchaseDetails.paymentOffer',
                'username': '$purchaseDetails.username',
                'total': {
                    $multiply: ['$purchaseDetails.pricePerUnit', '$purchaseDetails.quantity']
                }
            }
        }], (err1, result2) => {
            if (err1) {
                return errHan.commonError(err, res);
            }
            winston.info(`GET: (Super Admin) All Tickets list during mass settlement`);

            // Search treats collection
            treats.aggregate([{
                $match: {
                    'createdTime': {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    }
                }
            }, {
                $project: {
                    'createdTime': '$createdTime',
                    'email': '$details.email',
                    'paymentMethod': '$details.paymentMethod',
                    'amount': '$details.amount'
                }
            }], (err3, result4) => {
                if (err3) {
                    return errHan.commonError(err, res);
                }
                const object = {
                    adminList: result,
                    ticketList: result2,
                    treatList: result4
                };
                return returnHan.success(`GET: (Super Admin) All Treats list during mass settlement (start:${startDate} end:${endDate})`, object, res);
            });
        });
    });
};

module.exports.admin_company = (req, res, next) => {
    admins.find({
        'details.username': { // To trigger compound index
            $exists: true
        },
        'status': 'OP'
    }, [
        'status',
        'companyDetails'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Super Admin) All admin's company details`, result, res);
    });
};

module.exports.feedback_list = (req, res, next) => {
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
            $project: {
                'username': '$details.username',
                'content': '$details.content',
                'status': '$status'
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Super Admin) All feedback list`, result, res);
    });
};

module.exports.update_feedback_status = (req, res, next) => {
    const feedbackId = req.query.feedbackId;
    const status = req.body.status;

    if (errHan.missingParams([feedbackId, status], req)) {
        return res.status(404).json();
    }

    this.updateCollectionStatus(feedbacks, feedbackId, status, 'Feedback', res);
};

module.exports.get_tickets_list = (req, res, next) => {
    const userId = req.query.userId;
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    if (errHan.missingParams([userId, pageSize, pageNum], req)) {
        return res.status(404).json();
    }

    tickets.aggregate([{
            $match: {
                'userId': mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort: {
                'createdTime': -1
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
                'status': 1,
                'voucherId': 1,
                'restaurantId': 1,
                'createdTime': 1,
                'voucherDetails': {
                    'voucherName': 1,
                    'newPrice': 1
                }
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        return returnHan.success(`GET: (Super Admin) Tickets list ${pageSize} ${pageNum}`, result, res);
    });
};

module.exports.get_admin_restaurant_list = (req, res, next) => {
    const adminId = req.query.adminId;

    if (errHan.missingParams([adminId], req)) {
        return res.status(404).json();
    }

    admins.findOne({
        '_id': adminId
    }, ['restaurantList'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Admin restaurant list (adminId:${adminId})`, result, res);
    });
};

module.exports.create_branch = (req, res, next) => {
    let restaurantList = req.body.restaurantList;

    if (errHan.missingParams([restaurantList], req)) {
        return res.status(404).json();
    }

    restaurantList = comFun.convertArrayToObjectId(restaurantList);

    admins.updateMany({
        'restaurantId': {
            $in: restaurantList
        }
    }, {
        $set: {
            'restaurantList': restaurantList
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Super Admin) Add admin restaurant list`, res);
    });
};

module.exports.unlink_branch = (req, res, next) => {
    let restaurantList = req.body.restaurantList;

    if (errHan.missingParams([restaurantList], req)) {
        return res.status(404).json();
    }

    restaurantList = comFun.convertArrayToObjectId(restaurantList);

    admins.updateMany({
        'restaurantId': {
            $in: restaurantList
        }
    }, {
        $unset: {
            'restaurantList': ''
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Super Admin) Remove admin restaurant list`, res);
    });
};

module.exports.push_notifications = (req, res, next) => {
    const content = req.body.content;

    if (errHan.missingParams([content], req)) {
        return res.status(404).json();
    }

    users.find({}, ['deviceDetails.token'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        result.map((val) => {
            if (val.deviceDetails.token) {
                fcmController.fcmPush(val.deviceDetails.token, content);
            }
        });
        return returnHan.success(`GET: (Super Admin) Users token list`, result, res);
    });
};