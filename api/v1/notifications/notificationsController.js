const mongoose = require('mongoose');
const format = require('date-fns/format');
const parseISO = require('date-fns/parseISO');
const sanitize = require('mongo-sanitize');
const subDays = require('date-fns/subDays');
const winston = require('../utils/winston');
const notifications = require('./notificationsModel');
const tickets = require('../tickets/ticketsModel');
const errHan = require('../common/errorHandle');
const fcmController = require('./fcmController');
const comFun = require('../common/commonFunction');
const returnHan = require('../common/returnHandle');

/*
Notification Type notes (11 types)
R - Reservation (To Admin & User) [status = PD/AC/RJ/CC/CL]

G - Reservation Cancel (To Admin)

F - Feedback (To User)


FCM Type notes (7 types)
F - Feedback (To Admin & User)

T - Table (To Admin)
R - Reservation (To Admin) [status = PD/AC/RJ/CC/CL]
RN - Reservation - No action (To Admin)
G - Cancel Reservation (To Admin)
V - Voucher (To Admin)
O - Send Order (To Admin)
ON - Send Order - No action (To Admin)

C - Claim Voucher Confirmation (To User)
N - Notify Order Done (To User)
*/

module.exports.create_notification = (content) => {
    const notificationRecord = new notifications({
        _id: new mongoose.Types.ObjectId(),
        senderId: content.senderId,
        receiverId: content.receiverId,
        title: content.title,
        body: content.body,
        content: content.content,
        type: content.type
    });

    notificationRecord.save((err, result) => {
        if (err) {
            winston.error(err);
            return;
        }
        winston.info(`CREATE: New notification ${content.type} (notiId:${notificationRecord._id})`);
    });
};

module.exports.create_reservation_notification = (req, res, next) => {
    const re = req.body.object;
    const readableDate = format(parseISO(re.dateTime), 'dd MMM yyyy');
    let readableTime = format(parseISO(re.dateTime), 'hh:mm a');
    if (readableTime.charAt(0) === '0') {
        readableTime = readableTime.substr(1).toLowerCase();
    }
    const name = sanitize(re.name);
    const contact = sanitize(re.contact);
    const remark = sanitize(re.remark);

    if (errHan.missingParams([re.userId, re.userToken, re.restaurantId], req)) {
        return res.status(404).json();
    }

    // Push firebase notification
    const title = `${re.username} (${name} ${re.pax} pax)`;
    const body = `${readableTime} ${readableDate}`;
    fcmController.push_reservation_fcm(re.restaurantId, 'R', title, body);

    // Create new notification
    const notificationRecord = new notifications({
        _id: new mongoose.Types.ObjectId(),
        senderId: re.userId,
        receiverId: re.restaurantId,
        title: `${re.username} (${name} ${re.pax} pax)`,
        body: `${readableTime} ${readableDate}`,
        content: {
            restaurantId: re.restaurantId,
            restaurantName: re.restaurantName,
            status: 'PD',
            reservationDetails: {
                name: name,
                contact: contact,
                dateTime: re.dateTime,
                pax: re.pax,
                remark: comFun.decodeEntities(remark),
                extraRemark: re.extraRemark
            },
            userToken: re.userToken
        },
        type: 'R'
    });

    notificationRecord.save((err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        const final = {
            notificationId: notificationRecord._id
        };
        return returnHan.success(`CREATE: (User) New notification reservation (notiId:${notificationRecord._id} username:${re.username} resId:${re.restaurantId})`, final, res);
    });
};

module.exports.get_notifications = (req, res, next) => {
    const id = req.query.id;
    const type = req.query.type;
    // Pagination
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    if (errHan.missingParams([id, type, pageSize, pageNum], req)) {
        return res.status(404).json();
    }

    notifications.aggregate([{
            $match: {
                'receiverId': mongoose.Types.ObjectId(id),
                'type': type
            }
        },
        {
            $sort: {
                'createdTime': -1
            }
        },
        {
            $limit: skips + pageSize
        },
        {
            $skip: skips
        },
        {
            $project: {
                'title': 1,
                'body': 1,
                'createdTime': 1
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (All) Notifications ${type} ${pageSize} ${pageNum} (notiId:${id})`, result, res);
    });
};

module.exports.get_reservation_notifications = (req, res, next) => {
    const adminId = req.query.adminId;
    const filter = req.query.filter;
    // Pagination
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    if (errHan.missingParams([adminId, filter, pageSize, pageNum], req)) {
        return res.status(404).json();
    }

    let searchQuery;
    if (filter === 'true') {
        searchQuery = {
            'receiverId': mongoose.Types.ObjectId(adminId),
            'type': 'R',
            'content.status': {
                $in: ['PD', 'AC']
            },
            'content.reservationDetails.dateTime': {
                $gte: new Date()
            }
        };
    } else {
        searchQuery = {
            'receiverId': mongoose.Types.ObjectId(adminId),
            'type': 'R'
        };
    }
    notifications.aggregate([{
            $match: searchQuery
        },
        {
            $sort: {
                'createdTime': -1
            }
        },
        {
            $limit: skips + pageSize
        },
        {
            $skip: skips
        },
        {
            $project: {
                '_id': 1,
                'title': 1,
                'body': 1,
                'content': {
                    'reservationDetails': {
                        'dateTime': 1
                    },
                    'status': 1
                },
                'createdTime': 1
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Reservation notifications filter:${filter} ${pageSize} ${pageNum} (adminId:${adminId})`, result, res);
    });
};

module.exports.get_reservation_notifications_details = (req, res, next) => {
    const notificationId = req.query.notificationId;

    if (errHan.missingParams([notificationId], req)) {
        return res.status(404).json();
    }

    notifications.findOne({
        '_id': notificationId
    }, [
        'senderId',
        'receiverId',
        'content'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Reservation notifications details (notiId:${notificationId})`, result, res);
    });
};

module.exports.get_notifications_count = (req, res, next) => {
    const id = req.query.id;
    const type = req.query.type;

    if (errHan.missingParams([id, type], req)) {
        return res.status(404).json();
    }

    notifications.aggregate([{
            $match: {
                'receiverId': mongoose.Types.ObjectId(id),
                'type': type,
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
        return returnHan.success(`GET: (All) Notifications count ${type} (id:${id})`, result, res);
    });
};

module.exports.read_notifications = (req, res, next) => {
    const id = req.query.id;
    const type = req.query.type;

    if (errHan.missingParams([id, type], req)) {
        return res.status(404).json();
    }

    notifications.updateMany({
        'receiverId': mongoose.Types.ObjectId(id),
        'type': type,
        'isRead': false
    }, {
        'isRead': true
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (All) Notifications read ${type} (${id})`, res);
    });
};

module.exports.get_ticket_notifications = (req, res, next) => {
    const restaurantId = req.query.restaurantId;
    const filter = req.query.filter;
    // Pagination
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    if (errHan.missingParams([restaurantId, filter, pageSize, pageNum], req)) {
        return res.status(404).json();
    }

    let searchQuery;
    if ((filter === 'true')) {
        searchQuery = {
            'restaurantList': mongoose.Types.ObjectId(restaurantId),
            'status': 'PU'
        };
    } else {
        searchQuery = {
            'restaurantList': mongoose.Types.ObjectId(restaurantId),
            'status': {
                $in: ['PU', 'PC', 'HV']
            }
        };
    }

    tickets.aggregate([{
            $match: searchQuery
        },
        {
            $sort: {
                'createdTime': -1
            }
        },
        {
            $limit: skips + pageSize
        },
        {
            $skip: skips
        },
        {
            $project: {
                '_id': 1,
                'voucherName': '$voucherDetails.voucherName',
                'quantity': '$purchaseDetails.quantity',
                'username': '$purchaseDetails.username',
                'status': 1,
                'createdTime': 1
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        result = result.map(val => ({
            _id: val._id,
            title: `${val.username} has purchased`,
            body: `${val.quantity} x ${val.voucherName}`,
            status: val.status,
            createdTime: val.createdTime
        }));
        return returnHan.success(`GET: (Admin) Ticket notification filter=${filter} ${pageSize} ${pageNum} (resId:${restaurantId})`, result, res);
    });
};

module.exports.get_ticket_notifications_details = (req, res, next) => {
    const ticketId = req.query.ticketId;

    if (errHan.missingParams([ticketId], req)) {
        return res.status(404).json();
    }

    tickets.aggregate([{
            $match: {
                '_id': mongoose.Types.ObjectId(ticketId)
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
                'username': '$purchaseDetails.username',
                'contact': {
                    $arrayElemAt: ['$users.details.contact', 0]
                },
                'quantity': '$purchaseDetails.quantity',
                'voucherName': '$voucherDetails.voucherName',
                'claimed': '$usageDetails.claimed'
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Ticket notification details (tckId:${ticketId})`, result, res);
    });
};

module.exports.get_ticket_notifications_count = (req, res, next) => {
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    tickets.aggregate([{
            $match: {
                'restaurantList': mongoose.Types.ObjectId(restaurantId),
                'isAdminRead': false
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
        return returnHan.success(`GET: (Admin) Ticket notifications count (resId:${restaurantId})`, result, res);
    });
};

module.exports.read_ticket_notifications = (req, res, next) => {
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    tickets.updateMany({
        'restaurantList': mongoose.Types.ObjectId(restaurantId),
        'isAdminRead': false
    }, {
        'isAdminRead': true
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Admin) Ticket notifications read (resId:${restaurantId})`, res);
    });
};

module.exports.get_reservation_request = (req, res, next) => {
    const userId = req.query.id;
    // Limit 7 Days
    const today = new Date();
    const previousDay = subDays(today, 7);
    // Pagination
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    if (errHan.missingParams([userId, pageSize, pageNum], req)) {
        return res.status(404).json();
    }

    notifications.aggregate([{
            $match: {
                'senderId': mongoose.Types.ObjectId(userId),
                'type': 'R',
                'createdTime': {
                    $gte: previousDay,
                    $lte: today
                }
            }
        },
        {
            $sort: {
                'createdTime': -1
            }
        },
        {
            $limit: skips + pageSize
        },
        {
            $skip: skips
        },
        {
            $project: {
                '_id': 1,
                'content': {
                    'status': 1,
                    'restaurantId': 1,
                    'restaurantName': 1
                },
                'createdTime': 1
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        return returnHan.success(`GET: (User) Notifications reservation R ${pageSize} ${pageNum} (userId:${userId})`, result, res);
    });
};

module.exports.send_notifications = (req, res, next) => {
    const content = req.body.content;

    if (errHan.missingParams([content], req)) {
        return res.status(404).json();
    }

    const notificationRecord = new notifications({
        _id: new mongoose.Types.ObjectId(),
        receiverId: content.receiverId,
        title: content.title,
        body: content.body,
        type: content.type
    });

    notificationRecord.save((err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`CREATE: New notification ${content.type} (notiId:${notificationRecord._id})`, res);
    });
};