const mongoose = require('mongoose');
const sanitize = require('mongo-sanitize');
const winston = require('../utils/winston');
const tempOrders = require('./temp_ordersModel');
const orders = require('../orders/ordersModel');
const fc = require('../notifications/fcmController');
const errHan = require('../common/errorHandle');
const comFun = require('../common/commonFunction');
const returnHan = require('../common/returnHandle');

/*
Temp Order status notes (13 Status)
PC - Pending Confirmation (From User)
RJ - Rejected (From User)
AC - Accepted (From User)
UC - User Cancel (From User)

CF - Confirmed (From Admin)
PA - Pending Approval (From Admin)
CD - Cash Done (From Admin, Close)
CC - Cancelled (From Admin, Close)
OR - Order Removed (From Admin, Close)
*/

module.exports.create_temp_order = (req, res, next) => {
    const content = req.body.content;

    // save temp order
    const tempOrderRecord = new tempOrders({
        _id: new mongoose.Types.ObjectId(),
        userId: content.userId,
        fingerprint: content.fingerprint,
        restaurantId: content.restaurantId,
        orderDetails: content.orderDetails,
        billDetails: content.billDetails,
        status: 'PC'
    });

    // Push firebase notification
    fc.push_order_fcm(content.restaurantId, 'O', content.billDetails.username || `Table ${content.billDetails.tableNo}`, 'has made a new order', tempOrderRecord._id, 'PC');

    tempOrderRecord.save((err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        const final = {
            orderId: result._id,
            status: result.status
        };
        return returnHan.success(`CREATE: (User) New temp order (tempOrderId:${tempOrderRecord._id} resId:${content.restaurantId})`, final, res);
    });
};

module.exports.get_all_temp_order_list_header = (req, res, next) => {
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    tempOrders.find({
            'restaurantId': restaurantId,
            'status': {
                $nin: ['OR', 'CC', 'CD']
            }
        })
        .sort({
            'createdTime': -1
        })
        .select([
            '_id',
            'billDetails.username',
            'billDetails.tableNo',
            'status'
        ])
        .exec((err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.success(`GET: (Admin) All temp order list header (resId:${restaurantId})`, result, res);
        });
};

module.exports.get_temp_order_status = (req, res, next) => {
    const orderId = req.query.orderId;

    if (errHan.missingParams([orderId], req)) {
        return res.status(404).json();
    }

    tempOrders.findOne({
        '_id': orderId
    }, [
        'status',
        'reason'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (User) Temp order status (tempOrderId:${orderId} status:${result.status})`, result, res);
    });
};

module.exports.change_temp_order_status = (req, res, next) => {
    const orderId = req.query.orderId;
    const userToken = req.body.userToken;
    const status = req.body.status;
    const username = req.body.username;
    const restaurantId = req.body.restaurantId;
    const restaurantName = req.body.restaurantName;
    const content = req.body.content;
    const reason = sanitize(req.body.reason);

    if (errHan.missingParams([orderId, status], req)) {
        return res.status(404).json();
    }

    function saveRealOrder() {
        const orderRecord = new orders({
            _id: new mongoose.Types.ObjectId(),
            userId: content.userId,
            fingerprint: req.body.fingerprint,
            restaurantId: req.body.restaurantId,
            orderDetails: content.orderDetails,
            billDetails: content.billDetails,
            responseDetails: content.responseDetails,
            menuSettings: {
                modeDetails: content.menuSettings.md,
                totalDetails: content.menuSettings.td
            }
        });

        // save temporary order
        orderRecord.save((err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            winston.info(`CREATE: (User) New real order (orderId:${orderRecord._id} resId:${req.body.restaurantId})`);
        });
    }
    switch (status) {
        case 'AC': // Accepted
            fc.push_order_fcm(restaurantId, 'ON', username, 'Response accepted, please check status', orderId, status);
            break;
        case 'RJ': // Rejected
            fc.push_order_fcm(restaurantId, 'ON', username, 'Response rejected, please check status', orderId, status);
            break;
        case 'UC': // User Cancelled
            fc.push_order_fcm(restaurantId, 'ON', username, 'Order cancelled, please refresh order', orderId, status);
            break;
        case 'CC': // Cancelled
            if (userToken) {
                fc.push_order_fcm_token(userToken, 'O', restaurantName, `Order denied because ${reason}, please check status`, orderId, status, reason);
            }
            break;
        case 'CF': // Confirmed
            if (userToken) {
                fc.push_order_fcm_token(userToken, 'O', restaurantName, 'Order confirmed, please check status', orderId, status);
            }
            break;
        case 'CD': // Cash Done
            saveRealOrder();
            break;
        default:
            break;
    }

    const updateQuery = {
        'status': status
    };
    if (reason) {
        updateQuery.reason = reason;
    }
    tempOrders.findOneAndUpdate({
        '_id': orderId
    }, {
        $set: updateQuery
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (All) Temp order status to ${status} (tempOrderId:${orderId} resName:${restaurantName} username:${username})`, res);
    });
};

module.exports.check_temp_order_status = (req, res, next) => {
    const orderId = req.query.orderId;
    const status = req.query.status;

    if (errHan.missingParams([orderId, status], req)) {
        return res.status(404).json();
    }

    tempOrders.findOne({
        '_id': orderId
    }, [
        'status'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        const re = {
            status: result.status,
            canPop: true
        };

        const identifier = `(now ${status} previous ${result.status} tempOrderId ${orderId})`;

        function denied(text, canPop) {
            if (canPop === false) {
                re.canPop = false;
            }
            re.message = text;
            winston.warn(`CHECK: (All) ${text} ${identifier} - ${Buffer.byteLength(JSON.stringify(re))}`);
            return res.status(400).json(re);
        }

        if (status === re.status) {
            return denied(`You did the same <b>action</b> before, please <b>refresh list</b>`);
        }

        switch (status) {
            case 'PA':
            case 'CC': { // Admin action
                if (re.status === 'UC') {
                    return denied(`Customers has <b>cancelled</b> the order, please <b>refresh list</b>.`);
                }
                if (re.status === 'AC') {
                    return denied(`Customers has <b>accepted</b> edited response, please <b>refresh list</b>.`);
                }
                if (re.status === 'RJ') {
                    return denied(`Customers has <b>rejected</b> edited response, please <b>refresh list</b>.`);
                }
                if (re.status === 'CF') {
                    return denied(`You had <b>confirmed</b> before, please <b>refresh list</b>.`);
                }
                if (re.status === 'CC') {
                    return denied(`You had <b>cancelled</b> before, please <b>refresh list</b>.`);
                }
                if (re.status === 'PA') {
                    return denied(`You had <b>sent for response</b> before, please <b>refresh list</b>.`);
                }
                break;
            }
            case 'CF': { // Admin action
                if (re.status === 'UC') {
                    return denied(`Customers has <b>cancelled</b> the order, please <b>refresh list</b>.`);
                }
                if (re.status === 'OR') {
                    return denied(`You had <b>removed</b> this order before, please <b>refresh list</b>.`);
                }
                if (re.status === 'CC') {
                    return denied(`You had <b>cancelled</b> before, please <b>refresh list</b>`);
                }
                break;
            }
            case 'CD': { // Admin action
                if (re.status === 'OR') {
                    return denied(`You had <b>removed</b> this order before, please <b>refresh list</b>.`);
                }
                break;
            }
            case 'UC': { // User action
                if (re.status === 'CC') {
                    return denied(`Your order is <b>cancelled</b> please click <b>Check Response</b>`, false);
                }
                if (re.status === 'CF') {
                    return denied(`Your order is <b>confirmed</b>, please click <b>Check Response</b>`, false);
                }
                if (re.status === 'PA') {
                    return denied(`Your order <b>has response</b> that need your approval, please click <b>Check Response</b>`, false);
                }
                break;
            }
            case 'RJ':
            case 'AC': { // User action
                if (re.status === 'CC') {
                    return denied(`Your order is <b>cancelled</b> please click <b>Check Response</b>`, false);
                }
                break;
            }
            default:
                break;
        }
        return returnHan.success(`CHECK: (All) Temp order status ${identifier}`, result, res);
    });
};

module.exports.check_table_status = (req, res, next) => {
    const restaurantId = req.query.restaurantId;
    const tableNo = req.query.tableNo;
    const fingerprint = req.query.fingerprint;

    if (errHan.missingParams([restaurantId, tableNo, fingerprint], req)) {
        return res.status(404).json();
    }

    tempOrders.aggregate([{
            $match: {
                'restaurantId': mongoose.Types.ObjectId(restaurantId),
                'billDetails.tableNo': tableNo
            }
        },
        {
            $sort: {
                'createdTime': -1
            }
        },
        {
            $limit: 5
        },
        {
            $project: {
                'fingerprint': 1,
                'status': 1
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        if (!result.length) {
            return returnHan.successOnly(`CHECK: (User) Status can accept new order (resId:${restaurantId} fingerprint:${fingerprint} tableNo:${tableNo})`, res);
        }

        const resultList = result.map((val) => {
            switch (val.status) {
                case 'RJ':
                case 'UC':
                case 'CC':
                case 'CD':
                case 'OR': {
                    return true;
                }
                default: {
                    return (val.fingerprint === fingerprint);
                }
            }
        });

        const identifier = `(resId ${restaurantId} fingerprint ${fingerprint} tableNo ${tableNo})`;
        if (resultList.every(val => val === true)) {
            return returnHan.successOnly(`CHECK: (User) Status can accept new order ${identifier}`, res);
        }
        winston.warn(`CHECK: (User) Status cannot accept new order ${identifier}`);
        return res.status(400).json(err);
    });
};

module.exports.send_order_approval = (req, res, next) => {
    const orderId = req.query.orderId;
    const content = req.body.content;
    const info = req.body.info;
    const userToken = req.body.info.userToken;
    content.description = sanitize(content.description);
    content.description = comFun.decodeEntities(content.description);

    if (errHan.missingParams([orderId], req)) {
        return res.status(404).json();
    }

    // Push firebase notification
    if (userToken) {
        fc.push_order_fcm_token(userToken, 'O', info.restaurantName, 'has send for order edit approval', orderId, 'PA');
    }

    // Update tempOrders response details
    tempOrders.findOneAndUpdate({
        '_id': orderId
    }, {
        'responseDetails': content,
        'status': 'PA'
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Admin) Temp order status PA & responseDetails (tempOrderId:${orderId})`, res);
    });
};

module.exports.get_temp_order_details = (req, res, next) => {
    const orderId = req.query.orderId;

    if (errHan.missingParams([orderId], req)) {
        return res.status(404).json();
    }

    tempOrders.findOne({
        '_id': orderId
    }, [
        '_id',
        'userId',
        'fingerprint',
        'orderDetails',
        'billDetails',
        'responseDetails',
        'status',
        'createdTime'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Temp order details (tempOrderId:${orderId})`, result, res);
    });
};

module.exports.get_temp_order_count = (req, res, next) => {
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    tempOrders.aggregate([{
            $match: {
                'restaurantId': mongoose.Types.ObjectId(restaurantId),
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
        return returnHan.success(`GET: (Admin) Temp orders count (resId:${restaurantId})`, result, res);
    });
};

module.exports.read_temp_order = (req, res, next) => {
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    tempOrders.updateMany({
        'restaurantId': mongoose.Types.ObjectId(restaurantId),
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
        return returnHan.successOnly(`UPDATE: (Admin) Temp order read (resId:${restaurantId})`, res);
    });
};

module.exports.get_history_days_temp_orders = (req, res, next) => {
    const fingerprint = req.query.fingerprint;
    const restaurantId = req.query.restaurantId;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    if (errHan.missingParams([fingerprint, restaurantId, startDate, endDate, pageSize, pageNum], req)) {
        return res.status(404).json();
    }

    const searchQuery = {
        'createdTime': {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        },
        'restaurantId': mongoose.Types.ObjectId(restaurantId),
        'fingerprint': fingerprint
    };

    tempOrders.aggregate([{
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
        return returnHan.success(`GET: (Admin) History temp order ${pageSize} ${pageNum} (fingerprint:${fingerprint} restaurantId:${restaurantId})`, result, res);
    });
};

module.exports.get_history_days_temp_orders_details = (req, res, next) => {
    const orderId = req.query.orderId;

    if (errHan.missingParams([orderId], req)) {
        return res.status(404).json();
    }

    tempOrders.findOne({
        '_id': orderId
    }, [
        'orderDetails',
        'billDetails',
        'responseDetails',
        'createdTime'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Temp order details (orderId:${orderId})`, result, res);
    });
};