const mongoose = require('mongoose');
const addDays = require('date-fns/addDays');
const isAfter = require('date-fns/isAfter');
const vouchers = require('../vouchers/vouchersModel');
const winston = require('../utils/winston');
const errHan = require('../common/errorHandle');

function updateVoucherSoldOut(voucherId, res) {
    vouchers.findOneAndUpdate({
        '_id': voucherId
    }, {
        'status': 'SO',
        'details.soldOutTime': new Date()
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`UPDATE: (User) Voucher status to SO and add soldOutTime (vouId:${voucherId})`);
    });
}

function removeVoucherSoldOut(voucherId, res) {
    vouchers.findOneAndUpdate({
        '_id': voucherId
    }, {
        $set: {
            'status': 'OP'
        },
        $unset: {
            'details.soldOutTime': ''
        }
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`UPDATE: (User) Voucher status to OP and remove soldOutTime (vouId:${voucherId})`);
    });
}

function batchUpdateVoucherStatus(idList, status, res) {
    vouchers.updateMany({
        '_id': {
            $in: idList
        }
    }, {
        $set: {
            'status': status
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`UPDATE: (User) ${idList.length} voucher status to ${status} (vouchers:[${idList}])`);
    });
}

module.exports.checkVoucherStatus = (result) => {
    const voucherListCL = [];
    const final = result.filter((val) => {
        let needReturn = true;
        // Check for any 'SO' had passed one day
        if (val.status === 'SO') {
            if (val.details.soldOutTime) {
                const soldOutExpiry = addDays(val.details.soldOutTime, 1);
                if (isAfter(new Date(), soldOutExpiry)) {
                    needReturn = false;
                    voucherListCL.push(val._id);
                }
            }
        }
        // Check for any limited end time has over
        if (val.details.limitedEndTime) {
            const limitedEndExpiry = addDays(val.details.limitedEndTime, 1);
            if (isAfter(new Date(), limitedEndExpiry)) {
                needReturn = false;
                voucherListCL.push(val._id);
            }
        }
        // check for any expired voucher
        if (val.details.voucherRules.validUntil) {
            if (isAfter(new Date(), val.details.voucherRules.validUntil)) {
                needReturn = false;
                voucherListCL.push(val._id);
            }
        }
        // Check for any 'WG' has started
        if (val.status === 'WG') {
            if (isAfter(new Date(), val.details.startSellingTime)) {
                this.updateVoucherStatus(val._id, 'OP', '', 'Grab time has reached');
            }
        }
        return needReturn;
    });

    if (voucherListCL.length) {
        batchUpdateVoucherStatus(voucherListCL, 'CL');
    }

    return final;
};

module.exports.updateVoucherStatus = (voucherId, status, res, reason) => {
    vouchers.findOneAndUpdate({
        '_id': voucherId
    }, {
        'status': status
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err && res) {
            return errHan.commonError(err, res);
        }
        winston.info(`UPDATE: (User) Voucher status to ${status} due to ${reason} (vouId:${voucherId})`);
    });
};

module.exports.updateMonitorQuantitySold = (voucherId, userId, quantity, res) => {
    vouchers.findOneAndUpdate({
        '_id': voucherId
    }, {
        $inc: {
            'details.quantitySold': quantity
        }
    }, {
        'fields': {
            'details.quantitySold': 1,
            'details.limitedQuantity': 1,
            'status': 1
        },
        new: true // To check voucher sold
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        winston.info(`UPDATE: (User) Voucher quantity sold only ${quantity} (vouId:${voucherId} userId:${userId})`);
        const de = result.details;
        if (de.quantitySold >= de.limitedQuantity) {
            updateVoucherSoldOut(voucherId, res);
        } else if ((result.status === 'SO' || result.status === 'CL') && de.quantitySold < de.limitedQuantity) {
            removeVoucherSoldOut(voucherId, res);
        }

        if (res) {
            return res.status(200).json();
        }
    });
};

module.exports.pushNewLimitedPerUser = (voucherId, userId, quantity, res) => {
    vouchers.findOneAndUpdate({
        '_id': voucherId
    }, {
        $push: {
            'details.userPurchaseHistory': {
                userId: mongoose.Types.ObjectId(userId),
                quantityPurchased: quantity
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
        winston.info(`UPDATE: (User) Voucher limitedPerUser add new user (vouId:${voucherId} userId:${userId})`);
    });
};

module.exports.updateLimitedPerUser = (voucherId, userId, quantity, res) => {
    vouchers.findOneAndUpdate({
        '_id': voucherId
    }, {
        $inc: {
            'details.userPurchaseHistory.$[element].quantityPurchased': quantity
        }
    }, {
        arrayFilters: [{
            'element.userId': mongoose.Types.ObjectId(userId)
        }],
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`UPDATE: (User) Voucher limitedPerUser increase user counter ${quantity} (vouId:${voucherId} userId:${userId})`);
    });
};