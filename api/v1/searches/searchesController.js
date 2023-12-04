const mongoose = require('mongoose');
const loUnion = require('lodash/union');
const loSortBy = require('lodash/sortBy');
const winston = require('../utils/winston');
const restaurants = require('../restaurants/restaurantsModel');
const vouchers = require('../vouchers/vouchersModel');
const errHan = require('../common/errorHandle');
const vouFun = require('../common/voucherFunction');
const comFun = require('../common/commonFunction');
const returnHan = require('../common/returnHandle');

function getRestaurantsVouchers(idList, res) {
    if (!idList.length) {
        return returnHan.success('GET: (User) Restaurant voucher no more result', [], res);
    }
    // Get matching restaurant vouchers
    restaurants.aggregate([{
            $match: {
                '_id': {
                    $in: idList
                }
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
                    },
                    {
                        $project: {
                            'details.restaurantTypes': 1
                        }
                    }
                ],
                as: 'types'
            }
        },
        {
            $lookup: {
                from: 'vouchers',
                let: {
                    'id': '$_id'
                },
                pipeline: [{
                    $match: {
                        $expr: {
                            $and: [{
                                    $ne: ['HD', '$status']
                                },
                                {
                                    $ne: ['CL', '$status']
                                },
                                {
                                    $in: ['$$id', '$restaurantList']
                                }
                            ]
                        }
                    }
                }],
                as: 'vouchers'
            }
        },
        {
            $project: {
                '_id': '$_id',
                'restaurantImage': '$details.restaurantImage',
                'restaurantName': '$details.restaurantName',
                'restaurantType': {
                    $arrayElemAt: ['$types.details.restaurantTypes.name', 0]
                },
                'rating': '$details.rating',
                'vouchers': {
                    '_id': 1,
                    'details': {
                        'voucherName': 1,
                        'newPrice': 1,
                        'basePrice': 1,
                        'quantitySold': 1,
                        'soldOutTime': 1,
                        'startSellingTime': 1,
                        'limitedEndTime': 1,
                        'voucherRules': {
                            'validUntil': 1
                        }
                    },
                    'status': 1,
                    'order': 1
                }
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        // Arrange the result into idList order
        result = idList.map(val => result.filter(val2 => String(val) === String(val2._id))[0])

        // Check voucher availability & get restaurants name
        const resNameList = [];
        result = result.map((val) => {
            val.vouchers = vouFun.checkVoucherStatus(val.vouchers);
            resNameList.push(val.restaurantName);
            return val;
        });

        // Filter only required fields
        result = result.map(val => ({
            id: val._id,
            restaurantImage: val.restaurantImage,
            restaurantName: val.restaurantName,
            restaurantType: val.restaurantType,
            rating: val.rating,
            vouchers: !(val.vouchers.length) ? [] : loSortBy(val.vouchers, ['order']).map(val2 => ({
                id: val2._id,
                voucherName: val2.details.voucherName,
                newPrice: val2.details.newPrice,
                basePrice: val2.details.basePrice,
                quantitySold: val2.details.quantitySold
            }))
        }));

        return returnHan.success(`GET: (User) Restaurants vouchers (restaurants:[${resNameList}])`, result, res);
    });
}


module.exports.get_search_list = (req, res, next) => {
    restaurants.aggregate([{
            $match: {
                'status': 'OP'
            }
        },
        {
            $lookup: {
                from: 'vouchers',
                let: {
                    'restaurantId': '$_id'
                },
                pipeline: [{
                    $match: {
                        $expr: {
                            $and: [{
                                    $ne: ['HD', '$status']
                                },
                                {
                                    $ne: ['CL', '$status']
                                },
                                {
                                    $eq: ['$$restaurantId', '$restaurantId']
                                }
                            ]
                        }
                    }
                }],
                as: 'vouchers'
            }
        },
        {
            $project: {
                '_id': 1,
                'restaurantName': '$details.restaurantName',
                'vouchers': {
                    '_id': 1,
                    'details': {
                        'voucherName': 1
                    }
                }
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }

        const restaurantsList = [];
        const vouchersList = [];
        result.map((val) => {
            val.vouchers.map((val2) => {
                vouchersList.push({
                    _id: val2._id,
                    name: val2.details.voucherName
                });
                return val2;
            });
            restaurantsList.push({
                _id: val._id,
                name: val.restaurantName
            });
            return val;
        });
        const resultMapped = {
            restaurantsList: restaurantsList,
            vouchersList: vouchersList
        };
        return returnHan.success(`GET: (User) Restaurants vouchers search list`, resultMapped, res);
    });
};

module.exports.get_search_result = (req, res, next) => {
    const type = req.query.type;
    const input = req.query.input;

    const long = parseFloat(req.query.long);
    const lat = parseFloat(req.query.lat);

    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    if (errHan.missingParams([type], req)) {
        return res.status(404).json();
    }

    function findIt(collection, inp, search, selectedField, needSort) {
        const col = collection;
        const query = {
            status: 'OP'
        };
        if (search) {
            query[search] = inp; // Dynamic variable
        }
        let sortQuery = [];
        if (needSort) {
            sortQuery = {
                'details.rating': -1
            };
        }
        col.find(query)
            .sort(sortQuery)
            .limit(pageSize + skips)
            .skip(skips)
            .select([selectedField])
            .exec((err, result) => {
                if (err) {
                    return errHan.commonError(err, res);
                }
                winston.info(`GET: (User) Search one - ${type} ${pageSize} ${pageNum}`);
                let newResult = [];
                if (selectedField === 'restaurantList') {
                    result.map(val => newResult.push(...val[selectedField])); // Dynamic variable
                } else {
                    newResult = result.map(val => val[selectedField]); // Dynamic variable
                }
                // Call the another api here
                getRestaurantsVouchers(newResult, res);
            });
    }

    function findItNearby(collection, inp, search, isObjectId) {
        const col = collection;
        const query = {
            status: 'OP'
        };
        if (search) {
            query[search] = isObjectId ? mongoose.Types.ObjectId(inp) : inp; // Dynamic variable
        }

        col.aggregate([{
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [long, lat]
                    },
                    query: query,
                    distanceField: 'distance',
                    spherical: true
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
                    '_id': 1
                }
            }
        ], (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            winston.info(`GET: (User) Search one - ${type} ${pageSize} ${pageNum} (long:${long} lat:${lat})`);
            const newResult = result.map(val => val._id);
            // Call the another api here
            getRestaurantsVouchers(newResult, res);
        });
    }

    switch (type) {
        case 'foodType':
            findItNearby(restaurants, input, 'searchTags', true);
            break;
        case 'resType':
            findItNearby(restaurants, input, 'details.restaurantType', true);
            break;
        case 'area':
            findIt(restaurants, input, 'details.address.area', '_id');
            break;
        case 'place':
            findIt(restaurants, input, 'details.place', '_id');
            break;
        case 'street':
            findIt(restaurants, input, 'details.address.street', '_id');
            break;
        case 'restaurant':
            findIt(restaurants, input, '_id', '_id');
            break;
        case 'voucher':
            findIt(vouchers, input, '_id', 'restaurantList');
            break;
        case 'city':
            findIt(restaurants, input, 'details.address.city', '_id');
            break;
        case 'restriction':
            findItNearby(restaurants, input, 'details.restriction', false);
            break;
        case 'vegetarian':
            findItNearby(restaurants, input, 'details.isVegetarian', false);
            break;
        case 'top':
            findItNearby(restaurants, undefined, undefined, false);
            break;
        default:
            break;
    }
};

module.exports.get_nearby_search_result = (req, res, next) => {
    const long = parseFloat(req.query.long);
    const lat = parseFloat(req.query.lat);

    if (errHan.missingParams([long, lat], req)) {
        return res.status(404).json();
    }

    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    restaurants.aggregate([{
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [long, lat]
                },
                query: {
                    'status': 'OP'
                },
                distanceField: 'distance',
                spherical: true
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
                '_id': 1,
                'distance': 1
            }
        }
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        if (!result && result.length === 0) {
            return errHan.commonError('Nearby no result', res);
        }
        winston.info(`GET: (User) Search nearby ${pageSize} ${pageNum} (long:${long} lat:${lat})`);
        const newResult = result.map(val => val._id);
        // Call the another api here
        getRestaurantsVouchers(newResult, res);
    });
};

module.exports.get_search_result_batch = (req, res, next) => {
    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    function getVoucherRestaurantId(voucherList, existingRestaurantList) {
        const list = comFun.convertArrayToObjectId(voucherList);
        vouchers.aggregate([{
                $match: {
                    '_id': {
                        $in: list
                    }
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
                    'restaurantList': '$restaurantList'
                }
            }
        ], (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            const newResult = [];
            result.map(val => newResult.push(...val.restaurantList));

            if (existingRestaurantList) {
                winston.info('GET: (User) Both list combined');
                existingRestaurantList.map(val => String(val));
                newResult.map(val => String(val));
                const mergedResult = loUnion(existingRestaurantList, newResult);
                mergedResult.map(val => mongoose.Types.ObjectId(val));
                getRestaurantsVouchers(mergedResult, res);
            } else {
                winston.info(`GET: (User) Voucher list result batch ${pageSize} ${pageNum} (vouchers:[${list}])`);
                getRestaurantsVouchers(newResult, res);
            }
        });
    }

    function getMatchedRestaurantId(query, hasVoucherProperty) {
        restaurants.aggregate([{
                $match: {
                    $and: [{
                            'status': 'OP'
                        },
                        query
                    ]
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
                    '_id': 1
                }
            }
        ], (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            const newResult = result.map(val => val._id);

            if (hasVoucherProperty) {
                getVoucherRestaurantId(req.body.voucher, newResult);
            } else {
                winston.info(`GET: (User) Common list result batch ${pageSize} ${pageNum}`);
                getRestaurantsVouchers(newResult, res);
            }
        });
    }

    const query = {
        $or: [{
                '_id': {
                    $in: comFun.convertArrayToObjectId(req.body.restaurant)
                }
            }, {
                'details.restaurantType': {
                    $in: comFun.convertArrayToObjectId(req.body.resType)
                }
            },
            {
                'searchTags': {
                    $in: comFun.convertArrayToObjectId(req.body.foodType)
                }
            },
            {
                'details.address.area': {
                    $in: comFun.convertArrayToObjectId(req.body.area)
                }
            },
            {
                'details.address.place': {
                    $in: comFun.convertArrayToObjectId(req.body.place)
                }
            },
            {
                'details.address.street': {
                    $in: comFun.convertArrayToObjectId(req.body.street)
                }
            },
            {
                'details.place': {
                    $in: comFun.convertArrayToObjectId(req.body.place)
                }
            }
        ]
    };

    query.$or = query.$or.filter((value) => {
        const obj = value[Object.keys(value)[0]];
        const nestedObj = obj[Object.keys(obj)];
        return nestedObj !== undefined;
    });

    const hasCommonProperty = ((query.$or).length !== 0);
    const hasVoucherProperty = (req.body.voucher !== undefined);

    if (hasCommonProperty && hasVoucherProperty) {
        getMatchedRestaurantId(query, hasVoucherProperty);
    } else if (hasCommonProperty) {
        getMatchedRestaurantId(query, hasVoucherProperty);
    } else if (hasVoucherProperty) {
        getVoucherRestaurantId(req.body.voucher);
    }
};

module.exports.get_search_result_filter = (req, res, next) => {
    const arrange = req.body.arrange;
    const priceRange = req.body.priceRange;
    const voucherType = req.body.voucherType;
    const paxRange = req.body.paxRange;

    const pageSize = Number(req.query.page_size);
    const pageNum = Number(req.query.page_num);
    const skips = pageSize * (pageNum - 1);

    let arrangeQuery;
    let resultText = '';
    if (arrange) {
        switch (arrange) {
            case 'latest': {
                arrangeQuery = {
                    $sort: {
                        '_id': -1
                    }
                };
                break;
            }
            case 'oldest': {
                arrangeQuery = {
                    $sort: {
                        '_id': 1
                    }
                };
                break;
            }
            default:
                break;
        }
        resultText += `arrange ${arrange} `;
    }

    let priceRangeQuery;
    if (priceRange) {
        if (priceRange < 200) {
            priceRangeQuery = {
                'details.newPrice': {
                    $lte: priceRange
                }
            };
        } else {
            priceRangeQuery = {
                'details.newPrice': {
                    $gte: priceRange
                }
            };
        }
        resultText += `price ${priceRange} `;
    }

    let paxRangeQuery;
    if (paxRange) {
        if (paxRange < 10) {
            paxRangeQuery = {
                'details.suitablePax': {
                    $lte: paxRange
                }
            };
        } else {
            paxRangeQuery = {
                'details.suitablePax': {
                    $gte: paxRange
                }
            };
        }
        resultText += `pax ${paxRange} `;
    }

    let voucherTypeQuery;
    if (voucherType) {
        voucherTypeQuery = {
            'details.voucherType': voucherType
        };
        resultText += `voucherType ${voucherType}`;
    }

    const query = {
        $and: [{
                'status': {
                    $in: ['OP', 'WG']
                }
            },
            voucherTypeQuery,
            priceRangeQuery,
            paxRangeQuery
        ]
    };

    query.$and = query.$and.filter(value => value !== undefined);

    let masterQuery = [{
            $match: query
        },
        arrangeQuery,
        {
            $limit: pageSize + skips
        },
        {
            $skip: skips
        },
        {
            $group: {
                '_id': null,
                'restaurantList': {
                    $addToSet: '$restaurantList'
                }
            }
        },
        {
            $project: {
                '_id': 0,
                'restaurantList': '$restaurantList'
            }
        }
    ];

    masterQuery = masterQuery.filter(value => value !== undefined);

    vouchers.aggregate(masterQuery, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`GET: (User) Filter result (${resultText}) ${pageSize} ${pageNum}`);
        if (result.length) {
            getRestaurantsVouchers(result[0].restaurantId || [], res);
        } else {
            return res.status(200).json([]); // '[]' for front end
        }
    });
};