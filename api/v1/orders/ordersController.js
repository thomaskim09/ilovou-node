const mongoose = require('mongoose');
const orders = require('./ordersModel');
const fcmController = require('../notifications/fcmController');
const errHan = require('../common/errorHandle');
const returnHan = require('../common/returnHandle');

module.exports.get_history_months = (req, res, next) => {
    const id = req.query.id;
    const type = req.query.type;

    if (errHan.missingParams([id, type], req)) {
        return res.status(404).json();
    }

    let searchQuery;
    if (type === 'admin') {
        searchQuery = {
            'createdTime': { // To trigger compound index
                $exists: true
            },
            'restaurantId': mongoose.Types.ObjectId(id)
        };
    } else {
        searchQuery = {
            'createdTime': { // To trigger compound index
                $exists: true
            },
            'restaurantId': { // To trigger compound index
                $exists: true
            },
            'userId': mongoose.Types.ObjectId(id)
        };
    }

    orders.aggregate([{
            $match: searchQuery
        },
        {
            $project: {
                'year': {
                    $year: '$createdTime'
                },
                'month': {
                    $month: '$createdTime'
                }
            }
        },
        {
            $group: {
                '_id': {
                    'year': '$year',
                    'month': '$month'
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
        const text = type === 'admin' ? `resId:${id}` : `userId:${id}`;
        return returnHan.success(`GET: (${type}) History order years months (${text})`, result, res);
    });
};

module.exports.get_history_days = (req, res, next) => {
    const id = req.query.id;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    const type = req.query.type;

    if (errHan.missingParams([id, startDate, endDate, type], req)) {
        return res.status(404).json();
    }

    let searchQuery;
    if (type === 'admin') {
        searchQuery = {
            'createdTime': {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            'restaurantId': mongoose.Types.ObjectId(id)
        };
    } else {
        searchQuery = {
            'createdTime': {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            'userId': mongoose.Types.ObjectId(id)
        };
    }

    orders.aggregate([{
            $match: searchQuery
        },
        {
            $project: {
                'day': {
                    $dayOfMonth: '$createdTime'
                }
            }
        },
        {
            $group: {
                '_id': {
                    'day': '$day'
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
        const text = type === 'admin' ? `resId:${id}` : `userId:${id}`;
        return returnHan.success(`GET: (Admin) History order days (${text})`, result, res);
    });
};

module.exports.get_history_days_orders = (req, res, next) => {
    const id = req.query.id;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);
    const type = req.query.type;

    if (errHan.missingParams([id, startDate, endDate, pageSize, pageNum, type], req)) {
        return res.status(404).json();
    }

    let searchQuery;
    if (type === 'admin') {
        searchQuery = {
            'createdTime': {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            'restaurantId': mongoose.Types.ObjectId(id)
        };
    } else {
        searchQuery = {
            'createdTime': {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            'restaurantId': { // To trigger compound index
                $exists: true
            },
            'userId': mongoose.Types.ObjectId(id)
        };
    }

    orders.aggregate([{
            $match: searchQuery
        },
        {
            $limit: pageSize + skips
        },
        {
            $skip: skips
        },
        {
            $project: {
                'billDetails': {
                    'username': 1,
                    'tableNo': 1,
                    'totalPrice': 1
                },
                'responseDetails': {
                    'totalPrice': 1
                },
                'createdTime': 1
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        const text = type === 'admin' ? `resId:${id}` : `userId:${id}`;
        return returnHan.success(`GET: (Admin) History order ${pageSize} ${pageNum} (${text})`, result, res);
    });
};

module.exports.get_order_details = (req, res, next) => {
    const orderId = req.query.orderId;

    if (errHan.missingParams([orderId], req)) {
        return res.status(404).json();
    }

    orders.findOne({
        '_id': orderId
    }, [
        'orderDetails',
        'billDetails',
        'responseDetails',
        'menuSettings',
        'createdTime'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Order details (orderId:${orderId})`, result, res);
    });
};

module.exports.notify_user = (req, res, next) => {
    const content = req.body.content;
    const userToken = req.body.content.userToken;

    if (errHan.missingParams([content, userToken], req)) {
        return res.status(404).json();
    }

    // Push fcm notification to user
    fcmController.push_order_fcm_token(userToken, 'N', content.title, content.body);

    return res.status(200).json();
};