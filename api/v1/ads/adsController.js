const mongoose = require('mongoose');
const ads = require('./adsModel');
const vouchers = require('../vouchers/vouchersModel');
const restaurants = require('../restaurants/restaurantsModel');
const winston = require('../utils/winston');
const errHan = require('../common/errorHandle');
const returnHan = require('../common/returnHandle');

module.exports.get_ads = (req, res, next) => {
    ads.find({}, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (User) Ads document`, result, res);
    });
};

module.exports.update_ads = (req, res, next) => {
    const adsId = req.query.adsId;
    const type = req.body.type;
    const content = req.body.content;

    if (errHan.missingParams([adsId, type, content], req)) {
        return res.status(404).json();
    }

    const newContent = content.map(val => ({
        id: mongoose.Types.ObjectId(val.id),
        name: val.name,
        type: val.type
    }));

    const query = {
        $set: {}
    };
    switch (type) {
        case 'tags':
            query.$set.tags = newContent;
            break;
        case 'restaurants':
            query.$set.restaurants = newContent;
            break;
        case 'vouchers':
            query.$set.vouchers = newContent;
            break;
        default:
            break;
    }

    ads.findOneAndUpdate({
        '_id': adsId
    }, query, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.successOnly(`UPDATE: (Super Admin) Ads ${type} (adsId:${adsId})`, res);
    });
};

module.exports.get_ads_tags = (req, res, next) => {
    ads.find({}, ['tags'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (User) Ads tags list`, result[0], res);
    });
};

module.exports.get_ads_vouchers = (req, res, next) => {
    ads.find({}, ['vouchers.id'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        const list = result[0].vouchers.map(val => val.id);
        winston.info(`GET: (User) Ads voucher id list length:${list.length} - ${Buffer.byteLength(JSON.stringify(result))}`);

        vouchers.aggregate([{
                $match: {
                    '_id': {
                        $in: list
                    },
                    'status': {
                        $in: ['OP', 'WG']
                    }
                }
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
                $project: {
                    'restaurantId': 1,
                    'details': {
                        'newPrice': 1,
                        'basePrice': 1,
                        'voucherImage': 1,
                        'voucherName': 1,
                        'restaurantName': {
                            $arrayElemAt: ['$restaurants.details.restaurantName', 0]
                        }
                    }
                }
            }
        ], (err1, result1) => {
            if (err1) {
                return errHan.commonError(err1, res);
            }

            return returnHan.success(`GET: (User) Ads voucher list length:${result1.length}`, result1, res);
        });
    });
};

module.exports.get_ads_restaurants = (req, res, next) => {
    ads.find({}, ['restaurants.id'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        const list = result[0].restaurants.map(val => val.id);
        winston.info(`GET: (User) Ads restaurant id list length:${list.length}- ${Buffer.byteLength(JSON.stringify(result))}`);

        restaurants.aggregate([{
                $match: {
                    '_id': {
                        $in: list
                    },
                    'status': 'OP'
                }
            },
            {
                $lookup: {
                    from: 'tags',
                    let: {
                        'restaurantType': '$details.restaurantType'
                    },
                    pipeline: [{
                            $match: {
                                $expr: {
                                    $in: ['$$restaurantType', '$details.restaurantTypes._id']
                                }
                            }
                        },
                        {
                            $unwind: '$details.restaurantTypes'
                        },
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$details.restaurantTypes._id', '$$restaurantType']
                                }
                            }
                        }
                    ],
                    as: 'types'
                }
            },
            {
                $project: {
                    'restaurantImage': '$details.restaurantImage',
                    'restaurantName': '$details.restaurantName',
                    'restaurantType': {
                        $arrayElemAt: ['$types.details.restaurantTypes.name', 0]
                    },
                    'rating': '$details.rating'
                }
            }
        ], (err1, result1) => {
            if (err) {
                return errHan.commonError(err, res);
            }

            // Arrange the result into idList order
            result.sort((a, b) => list.indexOf(a) - list.indexOf(b));

            return returnHan.success(`GET: (User) Ads restaurants list length:${result1.length}`, result1, res);
        });
    });
};