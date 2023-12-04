const mongoose = require('mongoose');
const winston = require('../utils/winston');
const notifications = require('../notifications/notificationsModel');
const restaurants = require('../restaurants/restaurantsModel');
const ticketsReservation = require('../tickets/tickets_reservationModel');

const notiCon = require('../notifications/notificationsController');
const fcmController = require('../notifications/fcmController');
const ticketFun = require('../common/ticketFunction');
const errHan = require('../common/errorHandle');
const comFun = require('../common/commonFunction');
const returnHan = require('../common/returnHandle');

/*
Reservation notifications status type
PD - Pending (User)
AC - Accepted (Admin)
RJ - Rejected (Admin)
CC - Cancelled While Waiting (User)
CT - Cancelled When Tickets (User)
CL - Claimed (Admin)
*/

module.exports.get_reservation_settings = (req, res, next) => {
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    restaurants.findOne({
        '_id': restaurantId
    }, ['reservationSettings'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Reservation setting (resId:${restaurantId})`, result, res);
    });
};

module.exports.get_reservation_notice = (req, res, next) => {
    const restaurantId = req.query.restaurantId;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    restaurants.findOne({
        '_id': restaurantId
    }, [
        'reservationSettings.noticeContent'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Reservation notice (resId:${restaurantId})`, result, res);
    });
};

module.exports.update_reservation_notice = (req, res, next) => {
    const restaurantId = req.query.restaurantId;
    const noticeContent = req.body.noticeContent;

    if (errHan.missingParams([restaurantId], req)) {
        return res.status(404).json();
    }

    restaurants.findOneAndUpdate({
        '_id': restaurantId
    }, {
        'reservationSettings.noticeContent': noticeContent
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`UPDATE: (Admin) Reservation notice content (resId:${restaurantId})`, result, res);
    });
};

module.exports.update_reservation_settings = (req, res, next) => {
    const id = req.query.restaurantId;
    const settings = req.body.settings;

    if (errHan.missingParams([id, settings], req)) {
        return res.status(404).json();
    }

    restaurants.findOneAndUpdate({
        '_id': id
    }, {
        'reservationSettings': settings
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Admin) Reservation setting (resId:${id})`, res);
    });
};

module.exports.get_reservation_settings_user = (req, res, next) => {
    const id = req.query.restaurantId;

    if (errHan.missingParams([id], req)) {
        return res.status(404).json();
    }

    restaurants.findOne({
        '_id': id
    }, [
        'reservationSettings',
        'details.businessHours',
        'details.routineRestDay'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (User) Reservation setting (resId:${id})`, result, res);
    });
};

module.exports.change_reservation_status = (req, res, next) => {
    const notificationId = req.query.notificationId;
    const status = req.body.status;
    const restaurantId = req.body.restaurantId;
    const ticketId = req.body.ticketId;
    const userId = req.body.userId;
    const adminId = req.body.adminId;
    const username = req.body.username;
    const restaurantName = req.body.restaurantName;
    const reason = req.body.reason;
    const content = req.body.content;

    if (errHan.missingParams([notificationId, status], req)) {
        return res.status(404).json();
    }

    function createNotification(senderId, receiverId, title, body, type) {
        const notificationObject = {
            senderId: senderId,
            receiverId: receiverId,
            title: title,
            body: body,
            content: {
                status: status
            },
            type: type
        };
        notiCon.create_notification(notificationObject);
    }

    function changeNotificationStatus(role) {
        let updateQuery;
        if (role === 'user') {
            updateQuery = {
                'content.status': status,
                'content.userReason': reason
            };
        } else {
            updateQuery = {
                'content.status': status,
                'content.adminReason': reason
            };
        }
        notifications.findOneAndUpdate({
            '_id': notificationId
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
            return returnHan.successOnly(`UPDATE: (All) Notifications status to ${status} (notiId:${notificationId})`, res);
        });
    }

    function createTicketReservation() {
        const de = content.reservationDetails;
        const ticketRecord = new ticketsReservation({
            _id: new mongoose.Types.ObjectId(),
            ticketCode: `R${ticketFun.getUniqueCode()}`,
            userId: userId,
            restaurantId: restaurantId,
            reservationDetails: {
                name: de.name,
                contact: de.contact,
                dateTime: de.dateTime,
                pax: de.pax,
                remark: comFun.decodeEntities(de.remark),
                extraRemark: de.extraRemark,
                notificationId: notificationId
            },
            status: 'RE',
            isRead: false
        });
        ticketRecord.save((err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.successOnly(`CREATE: (Admin) New ticket reservation (tckId:${ticketRecord._id} userId:${userId} resId:${restaurantId})`, res);
        });
    }

    function deleteTicketReservation() {
        ticketsReservation.findOneAndDelete({
            '_id': ticketId
        }, [
            '_id' // To limit return output
        ], (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.successOnly(`DELETE: (User) Ticket reservation (tckId:${ticketId})`, res);
        });
    }

    switch (status) {
        case 'AC': {
            changeNotificationStatus('admin');
            const notiBody = 'Reservation is confirmed';
            fcmController.push_reservation_fcm_token(content.userToken, 'R', restaurantName, notiBody, status, notificationId);
            createTicketReservation();
            break;
        }
        case 'RJ': {
            changeNotificationStatus('admin');
            const notiBody = `Reservation is denied due to '${reason}'`;
            fcmController.push_reservation_fcm_token(content.userToken, 'R', restaurantName, notiBody, status, notificationId);
            break;
        }
        case 'CC': {
            changeNotificationStatus('user');
            const notiBody = `Has cancelled reservation while waiting`;
            fcmController.push_reservation_fcm(restaurantId, 'RN', username, notiBody, status, notificationId);
            break;
        }
        case 'CT': {
            changeNotificationStatus('user');
            const title = `${username} has cancelled booked reservation`;
            const notiBody = reason;
            createNotification(userId, adminId, title, notiBody, 'G');
            fcmController.push_reservation_fcm(restaurantId, 'G', title, notiBody, status, notificationId);
            deleteTicketReservation();
            break;
        }
        default:
            break;
    }
};

module.exports.check_reservation_status = (req, res, next) => {
    const notificationId = req.query.notificationId;
    const status = req.query.status;

    if (errHan.missingParams([notificationId, status], req)) {
        return res.status(404).json();
    }

    notifications.findOne({
        '_id': notificationId
    }, [
        'content.status',
        'content.adminReason'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        const re = {
            status: result.content.status
        };

        function denialUpdate(text) {
            re.message = text;
            winston.warn(re.message);
            return res.status(400).json(re);
        }

        switch (status) {
            case 'AC': {
                if (re.status === 'CC') {
                    return denialUpdate('Customer has cancelled the reservation, please <b>refresh</b> your list');
                }
                if (re.status === 'CT') {
                    return denialUpdate('Customer has cancelled the booked reservation, please <b>refresh</b> your list');
                }
                if (re.status === 'CL') {
                    return denialUpdate('Customer has claimed the reservation, please <b>refresh</b> your list');
                }
                if (re.status === 'AC') {
                    return denialUpdate('Your have accepted this before. please <b>refresh</b> your list');
                }
                if (re.status === 'RJ') {
                    return denialUpdate('Your have rejected this before. please <b>refresh</b> your list');
                }
                break;
            }
            case 'RJ': {
                if (re.status === 'CC') {
                    return denialUpdate('Customer has cancelled the reservation, please <b>refresh</b> your list');
                }
                if (re.status === 'CT') {
                    return denialUpdate('Customer has cancelled the booked reservation, please <b>refresh</b> your list');
                }
                if (re.status === 'CL') {
                    return denialUpdate('Customer has claimed the reservation, please <b>refresh</b> your list');
                }
                if (re.status === 'AC') {
                    return denialUpdate('Your have accepted this before. please <b>refresh</b> your list');
                }
                if (re.status === 'RJ') {
                    return denialUpdate('Your have rejected this before. please <b>refresh</b> your list');
                }
                break;
            }
            case 'CC': {
                if (re.status === 'AC') {
                    return denialUpdate('Your reservation had been <b>accepted</b>. You could find it in your ticket list :)');
                }
                if (re.status === 'RJ') {
                    return denialUpdate(`We are sorry but your reservation had been denied due to <b>${result.content.adminReason}</b>`);
                }
                break;
            }
            case 'CT': {
                if (re.status === 'CL') {
                    return denialUpdate(`Your reservation had been claimed. please <b>refresh</b> your list`);
                }
                break;
            }
            default:
                break;
        }

        return returnHan.successOnly(`CHECK: (User) Notification status (notiId:${notificationId})`, res);
    });
};

module.exports.get_reservation_status = (req, res, next) => {
    const notificationId = req.query.notificationId;

    if (errHan.missingParams([notificationId], req)) {
        return res.status(404).json();
    }

    notifications.findOne({
        '_id': notificationId
    }, [
        'content.status'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        const final = result.content.status;
        return returnHan.success(`GET: (User) Notification reservation status (notiId:${notificationId})`, final, res);
    });
};

module.exports.get_reservation_details = (req, res, next) => {
    const notificationId = req.query.notificationId;

    if (errHan.missingParams([notificationId], req)) {
        return res.status(404).json();
    }

    notifications.findOne({
        '_id': notificationId
    }, [
        'receiverId',
        'content'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        return returnHan.success(`GET: (User) Notification reservation details (notiId:${notificationId})`, result, res);
    });
};