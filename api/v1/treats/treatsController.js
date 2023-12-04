const mongoose = require('mongoose');
const sanitize = require('mongo-sanitize');
const treats = require('./treatsModel');
const errHan = require('../common/errorHandle');
const returnHan = require('../common/returnHandle');

module.exports.get_treats_id = (req, res, next) => {
    const final = {
        treatId: new mongoose.Types.ObjectId()
    };
    return returnHan.success(`GET: (Super Admin) Treat id (treatId:${final.treatId})`, final, res);
};

module.exports.create_treats = (req, res, next) => {
    const treatId = req.body.treatId;
    const senderDetails = req.body.senderDetails;
    const details = req.body.details;
    // Prepare treats to save
    const treatsRecord = new treats({
        _id: treatId,
        senderDetails: senderDetails,
        details: {
            email: details.email,
            content: sanitize(details.content),
            amount: details.amount,
            treatType: details.treatType,
            paymentMethod: details.paymentMethod,
            isAnonymous: details.isAnonymous
        }
    });

    // Save new treats
    treatsRecord.save((err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`CREATE: (All) New treats (treatId:${treatsRecord._id})`, res);
    });
};

module.exports.get_treats = (req, res, next) => {
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    treats.find({})
        .sort({
            'createdTime': -1
        })
        .limit(pageSize + skips)
        .skip(skips)
        .select([
            'details.amount',
            'details.treatType',
            'details.content',
            'createdTime'
        ])
        .exec((err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }

            return returnHan.success(`GET: (Super Admin) Treats list ${pageSize} ${pageNum}`, result, res);
        });
};

module.exports.get_treats_details = (req, res, next) => {
    const treatId = req.query.treatId;

    if (errHan.missingParams([treatId], req)) {
        return res.status(404).json();
    }

    treats.findOne({
        '_id': treatId
    }, ((err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Super Admin) Treats details (treatId:${treatId})`, result, res);
    }));
};