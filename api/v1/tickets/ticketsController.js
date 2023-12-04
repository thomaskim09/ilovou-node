const mongoose = require('mongoose');
const sanitize = require('mongo-sanitize');
const isAfter = require('date-fns/isAfter');
const isBefore = require('date-fns/isBefore');
const endOfDay = require('date-fns/endOfDay');
const isSameDay = require('date-fns/isSameDay');
const parseISO = require('date-fns/parseISO');
const addMonths = require('date-fns/addMonths');
const winston = require('../utils/winston');
const tickets = require('./ticketsModel');
const ticketsReservation = require('./tickets_reservationModel');

const notifications = require('../notifications/notificationsModel');
const fcmController = require('../notifications/fcmController');
const errHan = require('../common/errorHandle');
const ticketFun = require('../common/ticketFunction');
const voucherFun = require('../common/voucherFunction');
const returnHan = require('../common/returnHandle');

/*
Ticket status type
PU - Pending Usage
PC - Pending Comment
HV - History Voucher
*/

/*
Ticket status type
RE - Reservation
HR - History Reservation
*/

function updateTicketListExpiredStatus(ticketList, collection, status, res) {
    if (!tickets) {
        return;
    }
    if (!ticketList.length) {
        return;
    }
    collection.updateMany({
        '_id': {
            $in: ticketList
        }
    }, {
        $set: {
            'status': status,
            'expiredDate': new Date()
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`UPDATE: (User) ${ticketList.length} tickets status to expired ${status} (tickets:[${ticketList}])`);
    });
}

function claimTicketReservationFinished(ticketCode, restaurantId, status, res) {
    ticketsReservation.findOneAndUpdate({
        'ticketCode': ticketCode,
        'restaurantId': restaurantId
    }, {
        $set: {
            'status': status
        }
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Admin) Ticket reservation claimed and status to ${status} (tckCode:${ticketCode} resId:${restaurantId})`, res);
    });
}

function claimTicketFinished(ticketCode, restaurantId, quantity, status, res) {
    tickets.findOneAndUpdate({
        'ticketCode': ticketCode,
        'restaurantList': restaurantId
    }, {
        $inc: {
            'usageDetails.claimed': quantity
        },
        $set: {
            'status': status
        },
        $push: {
            'usageDetails.claimTime': {
                'quantity': quantity,
                'time': new Date()
            }
        }
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Admin) Ticket voucher claimed ${quantity} all and status to ${status} (tckCode:${ticketCode} resId:${restaurantId})`, res);
    });
}

function claimTicket(ticketCode, restaurantId, quantity, res) {
    tickets.findOneAndUpdate({
        'ticketCode': ticketCode,
        'restaurantList': restaurantId
    }, {
        $inc: {
            'usageDetails.claimed': quantity
        },
        $push: {
            'usageDetails.claimTime': {
                'quantity': quantity,
                'time': new Date()
            }
        }
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Admin) Ticket voucher claimed ${quantity} (tckCode:${ticketCode} resId:${restaurantId})`, res);
    });
}

module.exports.create_ticket_voucher = (req, res, next) => {
    const type = req.query.type;
    const vl = req.body;

    if (errHan.missingParams([type], req)) {
        return res.status(404).json();
    }

    // Update voucher limited array
    if (vl.isLimitedQuantityPerUser) {
        if (vl.isPurchasedBefore) {
            voucherFun.updateLimitedPerUser(vl.voucherId, vl.userId, vl.quantity);
        } else {
            voucherFun.pushNewLimitedPerUser(vl.voucherId, vl.userId, vl.quantity);
        }
    }

    // Update quantity sold
    if (type === 'full') {
        voucherFun.updateMonitorQuantitySold(vl.voucherId, vl.userId, vl.quantity, res);
    }

    // Push firebase notification
    const fcmObject = {
        title: `${vl.username} has purchased`,
        body: `${vl.quantity} x ${vl.voucherDetails.voucherName}`,
        content: '',
        type: 'V'
    };
    fcmController.push_restaurant_fcm(vl.restaurantId, fcmObject);

    // Save new ticket
    const ticketRecord = new tickets({
        _id: vl.ticketId,
        userId: vl.userId,
        restaurantId: vl.restaurantId,
        restaurantList: vl.restaurantList,
        ticketCode: `V${ticketFun.getUniqueCode()}`,
        voucherId: vl.voucherId,
        purchaseDetails: {
            purchaseTime: new Date(),
            paymentMethod: vl.paymentMethod,
            pricePerUnit: vl.pricePerUnit,
            paymentOffer: vl.paymentOffer,
            quantity: vl.quantity,
            username: vl.username,
            monthlyExpiryDate: vl.voucherDetails.limitPerDay ? addMonths(endOfDay(new Date()), 1) : undefined
        },
        voucherDetails: vl.voucherDetails,
        status: 'PU'
    });

    ticketRecord.save((err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`CREATE: (User) New ticket voucher (tckId:${ticketRecord._id} userId:${vl.userId} username:${vl.username})`, res);
    });
};

module.exports.get_unread_tickets_count = (req, res, next) => {
    const userId = req.query.userId;

    if (errHan.missingParams([userId], req)) {
        return res.status(404).json();
    }

    function count(collection, text) {
        collection.aggregate([{
                $match: {
                    'userId': mongoose.Types.ObjectId(userId),
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
            winston.info(`GET: (User) Ticket ${text} unread count (userId:${userId}) - ${Buffer.byteLength(JSON.stringify(result))}`);
            return (result.length !== 0) ? result[0].count : 0;
        });
    }

    let counter = 0;
    counter += count(tickets, 'voucher');
    counter += count(ticketsReservation, 'reservation');
    const result = [{
        count: counter
    }];
    return res.status(200).json(result);
};

module.exports.read_tickets = (req, res, next) => {
    const userId = req.query.userId;

    if (errHan.missingParams([userId], req)) {
        return res.status(404).json();
    }

    function read(collection, text) {
        collection.updateMany({
            'userId': mongoose.Types.ObjectId(userId),
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
            winston.info(`UPDATE: (User) Ticket ${text} read (userId:${userId})`);
        });
    }

    read(tickets, 'voucher');
    read(ticketsReservation, 'reservation');
    return res.status(200).json();
};

module.exports.get_tickets_list = (req, res, next) => {
    const userId = req.query.userId;
    const status = req.query.status;
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    if (errHan.missingParams([userId, status, pageSize, pageNum], req)) {
        return res.status(404).json();
    }

    let collection;
    let projectQuery;
    if (status === 'PU' || status === 'PC' || status === 'HV') {
        collection = tickets;
        projectQuery = {
            '_id': 1,
            'status': 1,
            'voucherId': 1,
            'restaurantId': 1,
            'expiredDate': 1,
            'purchaseDetails': {
                'monthlyExpiryDate': 1
            },
            'voucherDetails': {
                'voucherImage': 1,
                'voucherName': 1,
                'newPrice': 1,
                'basePrice': 1,
                'validUntil': 1
            },
            'restaurantName': {
                $arrayElemAt: ['$restaurants.details.restaurantName', 0]
            }
        };
    } else if (status === 'RE' || status === 'HR') {
        collection = ticketsReservation;
        projectQuery = {
            '_id': 1,
            'status': 1,
            'restaurantId': 1,
            'expiredDate': 1,
            'reservationDetails': {
                'restaurantImage': {
                    $arrayElemAt: ['$restaurants.details.restaurantImage', 0]
                },
                'dateTime': 1,
                'notificationId': 1
            },
            'restaurantName': {
                $arrayElemAt: ['$restaurants.details.restaurantName', 0]
            }
        };
    }

    collection.aggregate([{
            $match: {
                'userId': mongoose.Types.ObjectId(userId),
                'status': status
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
            $lookup: {
                from: 'restaurants',
                localField: 'restaurantId',
                foreignField: '_id',
                as: 'restaurants'
            }
        },
        {
            $project: projectQuery
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        if (result.length !== 0) {
            // Change status is ticket expire
            const voucherList = [];
            const reservationList = [];
            result = result.filter((val) => {
                if (val.status === 'PU') {
                    const MED = val.purchaseDetails.monthlyExpiryDate;
                    if (isAfter(new Date(), MED)) {
                        voucherList.push(val._id);
                        return false;
                    }
                    if (!MED && isAfter(new Date(), val.voucherDetails.validUntil)) {
                        voucherList.push(val._id);
                        return false;
                    }
                    return true;
                }
                if (val.status === 'RE') {
                    if (isAfter(new Date(), val.reservationDetails.dateTime)) {
                        reservationList.push(val._id);
                        return false;
                    }
                    return true;
                }
                return true;
            });
            updateTicketListExpiredStatus(voucherList, tickets, 'HV', res);
            updateTicketListExpiredStatus(reservationList, ticketsReservation, 'HR', res);
        }

        return returnHan.success(`GET: (User) Tickets list ${status} ${pageSize} ${pageNum} (userId:${userId})`, result, res);
    });
};

module.exports.get_ticket_details = (req, res, next) => {
    const ticketId = req.query.ticketId;
    const type = req.query.type;

    if (errHan.missingParams([ticketId, type], req)) {
        return res.status(404).json();
    }

    let collection;
    let masterQuery;
    if (type === 'voucher') {
        collection = tickets;
        masterQuery = [{
            $match: {
                '_id': mongoose.Types.ObjectId(ticketId)
            }
        }, {
            $lookup: {
                from: 'vouchers',
                localField: 'voucherId',
                foreignField: '_id',
                as: 'vouchers'
            }
        }, {
            $project: {
                '_id': 1,
                'voucherId': 1,
                'status': 1,
                'claimed': '$usageDetails.claimed',
                'ticketCode': 1,
                'purchaseDetails': 1,
                'expiredDate': 1,
                'voucherDetails': {
                    'voucherName': 1,
                    'basePrice': 1,
                    'minimumSpend': 1,
                    'voucherType': {
                        $arrayElemAt: ['$vouchers.details.voucherType', 0]
                    },
                    'setDetails': {
                        $arrayElemAt: ['$vouchers.details.setDetails', 0]
                    },
                    'quantityUnit': 1,
                    'quantityDetails': {
                        $arrayElemAt: ['$vouchers.details.quantityDetails', 0]
                    },
                    'limitPerDay': 1,
                    'monthlyDetails': {
                        $arrayElemAt: ['$vouchers.details.monthlyDetails', 0]
                    },
                    'voucherRules': {
                        $arrayElemAt: ['$vouchers.details.voucherRules', 0]
                    }
                }
            }
        }];
    } else if (type === 'reservation') {
        collection = ticketsReservation;
        masterQuery = [{
                $match: {
                    '_id': mongoose.Types.ObjectId(ticketId)
                }
            },
            {
                $project: {
                    '_id': 1,
                    'status': 1,
                    'ticketCode': 1,
                    'expiredDate': 1,
                    'reservationDetails': 1
                }
            }
        ];
    }

    collection.aggregate(masterQuery, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        if (!result) {
            return errHan.commonError('Error: No Result', res);
        }
        return returnHan.success(`GET: (User) Tickets details (tckId:${ticketId} type:${type})`, result, res);
    });
};

module.exports.get_ticket_details_quantity = (req, res, next) => {
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
            $project: {
                'ticketCode': 1,
                'expiredDate': 1,
                'claimed': '$usageDetails.claimed',
                'purchaseDetails': {
                    'quantity': 1
                },
                'voucherDetails': {
                    'quantityUnit': 1
                }
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        if (!result) {
            return errHan.commonError('Error: No Result', res);
        }

        return returnHan.success(`GET: (User) Tickets details quantity (tckId:${ticketId})`, result[0], res);
    });
};


module.exports.get_ticket_details_admin = (req, res, next) => {
    let ticketCode = sanitize(req.query.ticketCode);
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([ticketCode, restaurantId], req)) {
        return res.status(404).json();
    }

    let collection;
    let masterQuery;
    const first = String(ticketCode).charAt(0);
    if (first === 'V' || first === 'v') {
        if (first === 'v') {
            ticketCode = `V${ticketCode.slice(1, 9)}`;
        }
        collection = tickets;
        masterQuery = [{
                $match: {
                    'ticketCode': ticketCode,
                    'restaurantList': mongoose.Types.ObjectId(restaurantId),
                    'status': 'PU'
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
                $lookup: {
                    from: 'vouchers',
                    localField: 'voucherId',
                    foreignField: '_id',
                    as: 'vouchers'
                }
            },
            {
                $project: {
                    '_id': 1,
                    'voucherId': 1,
                    'status': 1,
                    'voucherDetails': {
                        'voucherName': 1,
                        'basePrice': 1,
                        'minimumSpend': 1,
                        'voucherType': {
                            $arrayElemAt: ['$vouchers.details.voucherType', 0]
                        },
                        'setDetails': {
                            $arrayElemAt: ['$vouchers.details.setDetails', 0]
                        },
                        'quantityUnit': 1,
                        'quantityDetails': {
                            $arrayElemAt: ['$vouchers.details.quantityDetails', 0]
                        },
                        'limitPerDay': 1,
                        'monthlyDetails': {
                            $arrayElemAt: ['$vouchers.details.monthlyDetails', 0]
                        },
                        'voucherRules': {
                            $arrayElemAt: ['$vouchers.details.voucherRules', 0]
                        }
                    },
                    'purchaseDetails': 1,
                    'claimed': '$usageDetails.claimed',
                    'claimTime': '$usageDetails.claimTime',
                    'userId': 1,
                    'userToken': {
                        $arrayElemAt: ['$users.deviceDetails.token', 0]
                    }
                }
            }
        ];
    } else if (first === 'R' || first === 'r') {
        if (first === 'r') {
            ticketCode = `R${ticketCode.slice(1, 9)}`;
        }
        collection = ticketsReservation;
        masterQuery = [{
                $match: {
                    'ticketCode': ticketCode,
                    'restaurantId': mongoose.Types.ObjectId(restaurantId),
                    'status': 'RE'
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
                    '_id': 1,
                    'status': 1,
                    'reservationDetails': 1,
                    'userId': 1,
                    'userToken': {
                        $arrayElemAt: ['$users.deviceDetails.token', 0]
                    }
                }
            }
        ];
    }

    if (!masterQuery) {
        return errHan.commonError(`Error: (Admin) Invalid ticketCode (ticketCode:${ticketCode} resId:${restaurantId})`, res);
    }

    collection.aggregate(masterQuery, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Tickets detail (ticketCode:${ticketCode} resId:${restaurantId} first:${first})`, result[0] || [], res);
    });
};

module.exports.claim_ticket_voucher = (req, res, next) => {
    const ticketCode = req.query.ticketCode;
    const val = req.body.object;

    if (errHan.missingParams([ticketCode], req)) {
        return res.status(404).json();
    }

    let quantityLeft;
    if (val.quantityUnit) {
        quantityLeft = (val.quantityPurchased * val.quantityUnit) - val.claimed;
    } else {
        quantityLeft = val.quantityPurchased - val.claimed;
    }

    if (quantityLeft === val.quantity && val.voucherType !== 'MV') {
        claimTicketFinished(ticketCode, val.restaurantId, val.quantity, 'PC', res);
    } else if (quantityLeft > val.quantity || val.voucherType === 'MV') {
        claimTicket(ticketCode, val.restaurantId, val.quantity, res);
    } else {
        return errHan.commonError(`Error: Quantity exceed quantityLeft (ticketCode:${ticketCode})`, res);
    }
};

module.exports.claim_ticket_reservation = (req, res, next) => {
    const ticketCode = sanitize(req.query.ticketCode);
    const restaurantId = req.query.restaurantId;
    const quantity = Number(req.body.quantity);
    const notificationId = req.body.notificationId;

    if (errHan.missingParams([ticketCode, restaurantId, quantity, notificationId], req)) {
        return res.status(404).json();
    }

    notifications.findOneAndUpdate({
        '_id': notificationId
    }, {
        $set: {
            'content.status': 'CL'
        }
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`UPDATE: Notifications status to CL (notiId:${notificationId})`);

        claimTicketReservationFinished(ticketCode, restaurantId, 'HR', res);
    });
};

module.exports.send_fcm_claim_confirmation = (req, res, next) => { // todo remove
    const role = req.query.role;
    const vl = req.body;

    if (errHan.missingParams([role])) {
        return res.status(404).json();
    }

    if (role === 'user') {
        if (errHan.missingParams([vl.adminToken], req)) {
            return res.status(404).json();
        }

        const fcmObject = {
            type: 'X',
            title: `Voucher claim confirmation`,
            body: `Please turn on your Vouplan to receive confirmation`,
            content: {
                ticketCode: vl.ticketCode
            }
        };
        fcmController.fcmPush(vl.adminToken, fcmObject);
    } else {
        if (errHan.missingParams([vl.userToken])) {
            return res.status(404).json();
        }

        const fcmObject = {
            type: 'C',
            title: `Confirm claim?`,
            body: `${vl.quantity} units ${vl.voucherName}`,
            content: {
                ticketCode: vl.ticketCode,
                adminToken: vl.adminToken
            }
        };
        fcmController.fcmPush(vl.userToken, fcmObject);
    }
    return res.status(200).json();
};

module.exports.get_summary_ticket = (req, res, next) => {
    const restaurantId = req.query.restaurantId;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    if (errHan.missingParams([restaurantId, startDate, endDate], req)) {
        return res.status(404).json();
    }

    tickets.aggregate([{
            $match: {
                'purchaseDetails.purchaseTime': {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                'restaurantId': mongoose.Types.ObjectId(restaurantId)
            }
        },
        {
            $project: {
                'purchaseDetails': {
                    'purchaseTime': 1,
                    'pricePerUnit': 1,
                    'quantity': 1,
                    'voucherName': 1,
                    'total': {
                        $multiply: ['$purchaseDetails.pricePerUnit', '$purchaseDetails.quantity']
                    }
                }
            }
        }, {
            $group: {
                '_id': 'x',
                'details': {
                    $push: '$purchaseDetails'
                }
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Summary tickets voucher (resId:${restaurantId} start:${startDate} end:${endDate})`, result, res);
    });
};

module.exports.check_monthly_limit = (req, res, next) => {
    const ticketId = req.query.ticketId;
    const quantity = req.query.quantity;

    if (errHan.missingParams([ticketId, quantity], req)) {
        return res.status(404).json();
    }

    function denied(text) {
        winston.warn(`CHECK: (Admin) ${text} (ticketId:${ticketId})`);
        return res.status(400).json({
            error: text
        });
    }

    tickets.findOne({
        '_id': ticketId
    }, [
        'status',
        'purchaseDetails.monthlyExpiryDate',
        'voucherDetails.limitPerDay',
        'usageDetails.claimTime'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        if (!result) {
            return errHan.commonError(`Error: No ticket found (ticketId:${ticketId})`, res);
        }

        // Check status
        if (result.status !== 'PU') {
            return denied('Ticket is not claimable');
        }
        // Check if pass one month
        if (isAfter(new Date(), result.purchaseDetails.monthlyExpiryDate)) {
            return denied('Ticket has passed one month');
        }
        // Check if pass limit per day
        const limitPerDay = result.voucherDetails.limitPerDay;
        if (quantity > limitPerDay) {
            return denied(`Ticket's limit per day has exceed`);
        }
        // Check if pass one day
        const claimList = result.usageDetails.claimTime;
        if (claimList) {
            const lastTime = parseISO(claimList[claimList.length - 1].time);
            if (isBefore(new Date(), endOfDay(lastTime))) {
                return denied('Ticket limit reached, please try again tomorrow');
            }
            let total = 0;
            if (isSameDay(lastTime, new Date())) {
                claimList.map((val) => {
                    if (isSameDay(lastTime, parseISO(val.time))) {
                        total += val.quantity;
                    }
                });
            }
            if (limitPerDay - total <= 0) {
                return denied('Ticket limit reached, please try again tomorrow');
            }
        }

        return returnHan.success(`CHECK: (Admin) Monthly limit (ticketId:${ticketId})`, result, res);
    });
};

module.exports.check_ticket_availability = (req, res, next) => {
    const ticketId = req.query.ticketId;

    if (errHan.missingParams([ticketId], req)) {
        return res.status(404).json();
    }

    function denied(text) {
        winston.warn(`CHECK: (User) ${text} (ticketId: ${ticketId})`);
        return res.status(400).json({
            error: text
        });
    }

    tickets.findOne({
        '_id': ticketId
    }, [
        'status',
        'voucherDetails.validUntil',
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        // Check status
        if (result.status !== 'PU') {
            return denied('Ticket is not claimable');
        }
        const de = result.voucherDetails;
        // Check expiry date
        if (de.validUntil) {
            if (isAfter(new Date(), de.validUntil)) {
                return denied('Voucher has expired');
            }
        }

        return returnHan.successOnly(`CHECK: (Admin) Ticket details (ticketId:${ticketId})`, res);
    });
};