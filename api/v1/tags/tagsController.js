const mongoose = require('mongoose');
const tags = require('./tagsModel');
const errHan = require('../common/errorHandle');
const returnHan = require('../common/returnHandle');

module.exports.get_all_types = (req, res, next) => {
    tags.find({}, [
        'details.restaurantTypes',
        'details.foodTypes'
    ], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Get all restaurant & food types`, result[0], res);
    });
};

module.exports.get_all_common_tags = (req, res, next) => {
    tags.aggregate([{
        $project: {
            'details.restaurantTypes': {
                $filter: {
                    input: '$details.restaurantTypes',
                    as: 'resType',
                    cond: {
                        $ne: ['$$resType.counter', 0]
                    }
                }
            },
            'details.foodTypes': {
                $filter: {
                    input: '$details.foodTypes',
                    as: 'foodType',
                    cond: {
                        $ne: ['$$foodType.counter', 0]
                    }
                }
            }
        }
    }], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Get all common tags`, result, res);
    });
};

module.exports.create_tag = (req, res, next) => {
    const tagRecord = new tags({
        _id: new mongoose.Types.ObjectId(),
        details: {
            restaurantTypes: [],
            foodTypes: []
        }
    });

    tagRecord.save((err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`CREATE: (Super Admin) Tag document (tagId:${tagRecord._id})`, result, res);
    });
};

module.exports.get_tag_id = (req, res, next) => {
    tags.find({}, ['_id'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Get all food types`, result, res);
    });
};

module.exports.add_tags = (req, res, next) => {
    const tagId = req.query.tagId;
    const type = req.body.type;
    const newName = req.body.content;

    if (errHan.missingParams([tagId, type, newName], req)) {
        return res.status(404).json();
    }

    const searchQuery = {
        '_id': tagId
    };

    const typeRecord = {
        _id: new mongoose.Types.ObjectId(),
        name: newName,
        counter: 0
    };

    let updateQuery;
    switch (type) {
        case 'resType':
            updateQuery = {
                $push: {
                    'details.restaurantTypes': typeRecord
                }
            };
            break;
        case 'foodType':
            updateQuery = {
                $push: {
                    'details.foodTypes': typeRecord
                }
            };
            break;
        default:
            break;
    }


    const filterQuery = {
        new: true
    };

    tags.findOneAndUpdate(searchQuery, updateQuery, filterQuery, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`UPDATE: (Super Admin) New ${type} ${newName}`, result, res);
    });
};

module.exports.rename_tags = (req, res, next) => {
    const tagId = req.query.tagId;
    const type = req.body.type;
    const childId = req.body.childId;
    const content = req.body.content;

    if (errHan.missingParams([tagId, type, childId, content], req)) {
        return res.status(404).json();
    }

    const searchQuery = {
        '_id': tagId
    };

    let updateQuery;
    switch (type) {
        case 'resType':
            updateQuery = {
                'details.restaurantTypes.$[element].name': content
            };
            break;
        case 'foodType':
            updateQuery = {
                'details.foodTypes.$[element].name': content
            };
            break;
        default:
            break;
    }

    const filterQuery = {
        arrayFilters: [{
            'element._id': mongoose.Types.ObjectId(childId)
        }],
        new: true
    };

    tags.findOneAndUpdate(searchQuery, updateQuery, filterQuery, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`UPDATE: (Super Admin) Rename ${type} to ${content}`, result, res);
    });
};

module.exports.delete_tags = (req, res, next) => {
    const tagId = req.query.tagId;
    const type = req.body.type;
    const childId = req.body.childId;

    if (errHan.missingParams([tagId, type, childId], req)) {
        return res.status(404).json();
    }

    const searchQuery = {
        '_id': tagId
    };

    let updateQuery;
    switch (type) {
        case 'resType':
            updateQuery = {
                $pull: {
                    'details.restaurantTypes': {
                        '_id': childId
                    }
                }
            };
            break;
        case 'foodType':
            updateQuery = {
                $pull: {
                    'details.foodTypes': {
                        '_id': childId
                    }
                }
            };
            break;
        default:
            break;
    }

    const filterQuery = {
        new: true
    };

    tags.findOneAndUpdate(searchQuery, updateQuery, filterQuery, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`UPDATE: (Super Admin) Delete ${type}`, result, res);
    });
};