const FCM = require('fcm-push');
const keys = require('../../../config/keys');
const admins = require('../admins/adminsModel');
const users = require('../users/usersModel');
const winston = require('../utils/winston');
const errHan = require('../common/errorHandle');
const comFun = require('../common/commonFunction');

const fcm = new FCM(keys.fcm.serverKey);

// Internal file usage start
module.exports.remove_restaurant_token = (restaurantId, deviceToken, res) => {
    admins.findOneAndUpdate({
        'restaurantId': restaurantId
    }, {
        $pull: {
            'deviceDetails': {
                'token': deviceToken
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
        winston.info(`REMOVE: (User) Admin device details for FCM (resId:${restaurantId} token: ${deviceToken})`);
    });
};
// Internal file usage end

module.exports.fcmPush = (token, content, restaurantId) => {
    if (errHan.missingParams([token])) {
        return;
    }
    const message = {
        to: token,
        notification: {
            title: comFun.decodeEntities(content.title),
            body: comFun.decodeEntities(content.body),
            icon: 'stock_ticker_update'
        },
        data: {
            type: content.type,
            content: content.content
        }
    };
    fcm.send(message, (err, response) => {
        if (err) {
            winston.error(`ERROR: Fcm notification error (${err})`);
            if (restaurantId) {
                this.remove_restaurant_token(restaurantId, token);
            }
        } else {
            winston.info(`PUSH: ${content.title} (${content.body}) - ${content.type} (token: ${token.slice(0, 5)}) - ${Buffer.byteLength(JSON.stringify(message))}`);
        }
    });
};

module.exports.register_user_fcm_device = (userId, token, fingerprint, details) => {
    users.findOneAndUpdate({
        '_id': userId
    }, {
        deviceDetails: {
            token: token,
            fingerprint: fingerprint,
            details: details
        }
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            winston.error(err);
            return;
        }
        winston.info(`UPDATE: (User) Device token (userId:${userId} fingerprint:${fingerprint})`);
    });
};

module.exports.update_admin_fcm_device = (adminId, deviceDetails) => {
    admins.findOneAndUpdate({
        '_id': adminId
    }, {
        'deviceDetails': deviceDetails
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return winston.error(err);
        }
        winston.info(`UPDATE: (Admin) Overrides old devices (adminId:${adminId})`);
    });
};

module.exports.register_admin_fcm_device = (adminId, token, fingerprint) => {
    admins.findOneAndUpdate({
        '_id': adminId
    }, {
        $push: {
            'deviceDetails': {
                token: token,
                fingerprint: fingerprint
            }
        }
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return winston.error(err);
        }
        winston.info(`UPDATE: (Admin) Device token (adminId:${adminId} fingerprint:${fingerprint})`);
    });
};

module.exports.push_restaurant_fcm = (restaurantId, content, res) => {
    admins.findOne({
        'restaurantId': restaurantId
    }, ['deviceDetails'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`GET: (User) Admin device details for FCM (resId:${restaurantId})`);
        result.deviceDetails.map(val => this.fcmPush(val.token, content, restaurantId));
    });
};

module.exports.push_order_fcm = (restaurantId, type, title, body, orderId, status, reason) => {
    const fcmObject = {
        title: title,
        body: body,
        content: {
            orderId: orderId,
            status: status,
            reason: reason
        },
        type: type
    };
    this.push_restaurant_fcm(restaurantId, fcmObject);
};

module.exports.push_order_fcm_token = (token, type, title, body, orderId, status, reason) => {
    const fcmObject = {
        title: title,
        body: body,
        content: {
            orderId: orderId,
            status: status,
            reason: reason
        },
        type: type
    };
    this.fcmPush(token, fcmObject);
};

module.exports.push_reservation_fcm = (restaurantId, type, title, body, status, notificationId) => {
    const fcmObject = {
        title: title,
        body: body,
        content: {
            notificationId: notificationId,
            status: status
        },
        type: type
    };
    this.push_restaurant_fcm(restaurantId, fcmObject);
};

module.exports.push_reservation_fcm_token = (token, type, title, body, status, notificationId) => {
    const fcmObject = {
        title: title,
        body: body,
        content: {
            notificationId: notificationId,
            status: status
        },
        type: type
    };
    this.fcmPush(token, fcmObject);
};