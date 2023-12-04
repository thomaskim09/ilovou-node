const mongoose = require('mongoose');
const tempNotifications = require('./temp_notificationsModel');
const fc = require('../notifications/fcmController');
const errHan = require('../common/errorHandle');
const comFun = require('../common/commonFunction');
const returnHan = require('../common/returnHandle');

module.exports.need_service = (req, res, next) => {
    const content = req.body.content;

    if (errHan.missingParams([content.receiverId], req)) {
        return res.status(404).json();
    }

    // Push fcm notification to admin
    fc.push_order_fcm(content.receiverId, 'T', content.title, content.body);

    const tempNotificationRecord = new tempNotifications({
        _id: new mongoose.Types.ObjectId(),
        senderId: content.senderId,
        receiverId: content.receiverId,
        fingerprint: content.fingerprint,
        content: {
            reason: comFun.decodeEntities(content.reason)
        },
        title: comFun.decodeEntities(content.title),
        body: content.body
    });

    // Save new temp notifications
    tempNotificationRecord.save((err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`CREATE: New temp notification order (tempNotiId:${tempNotificationRecord._id})`, res);
    });
};

module.exports.get_temp_notifications = (req, res, next) => {
    const id = req.query.id;
    // Pagination
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    if (errHan.missingParams([id, pageSize, pageNum], req)) {
        return res.status(404).json();
    }

    tempNotifications.aggregate([{
            $match: {
                'receiverId': mongoose.Types.ObjectId(id)
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
                'title': 1,
                'body': 1,
                'content.reason': 1,
                'createdTime': 1
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Temp Notifications ${pageSize} ${pageNum} (resId:${id})`, result, res);
    });
};

module.exports.get_temp_notifications_count = (req, res, next) => {
    const id = req.query.id;

    if (errHan.missingParams([id], req)) {
        return res.status(404).json();
    }

    tempNotifications.aggregate([{
            $match: {
                'receiverId': mongoose.Types.ObjectId(id),
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
        return returnHan.success(`GET: (Admin) Temp notifications count (adminId:${id})`, result, res);
    });
};

module.exports.read_temp_notifications = (req, res, next) => {
    const id = req.query.id;

    if (errHan.missingParams([id], req)) {
        return res.status(404).json();
    }

    tempNotifications.updateMany({
        'receiverId': mongoose.Types.ObjectId(id),
        'isRead': false
    }, {
        $set: {
            'isRead': true
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Admin) Temp notifications read (adminId:${id})`, res);
    });
};