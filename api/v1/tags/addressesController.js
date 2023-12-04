const mongoose = require('mongoose');
const addresses = require('./addressesModel');
const errHan = require('../common/errorHandle');
const returnHan = require('../common/returnHandle');

module.exports.get_all_address = (req, res, next) => {
    addresses.find({}, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) All Address`, result, res);
    });
};


module.exports.get_postcodes_all_children = (req, res, next) => {
    const cityId = req.query.cityId;

    if (errHan.missingParams([cityId], req)) {
        return res.status(404).json();
    }

    addresses.find({
        'cities._id': cityId
    }, {
        'cities.$[element].postcodes': 1
    }, {
        arrayFilters: [{
            'element._id': mongoose.Types.ObjectId(cityId)
        }]
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Admin) Get postcodes all children (cityId:${cityId})`, result, res);
    });
};

module.exports.get_all_cities_location = (req, res, next) => {
    addresses.find({},
        [
            'cities._id',
            'cities.city',
            'cities.shortName',
            'cities.location'
        ], (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.success(`GET: (User) Get all cities location`, result, res);
        });
};

module.exports.get_all_areas_places = (req, res, next) => {
    addresses.find({},
        [
            'cities.postcodes.areas._id',
            'cities.postcodes.areas.area',
            'cities.postcodes.areas.area',
            'cities.postcodes.areas.places._id',
            'cities.postcodes.areas.places.place'
        ], (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.success(`GET: (Super Admin) Get all areas places`, result, res);
        });
};

module.exports.add_address = (req, res, next) => {
    const type = req.body.type;
    const content = req.body.content;
    const stateId = req.body.stateId;
    const parentId = req.body.parentId;

    if (errHan.missingParams([type, content], req)) {
        return res.status(404).json();
    }

    if (type === 'state') {
        const addressRecord = new addresses({
            _id: new mongoose.Types.ObjectId(),
            state: content.name,
            cities: []
        });
        addressRecord.save((err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.success(`CREATE: (Super Admin) State document ${content.name} (stateId:${addressRecord._id})`, result, res);
        });
    } else {
        if (errHan.missingParams([stateId, parentId], req)) {
            return res.status(404).json();
        }
        const searchQuery = {
            '_id': stateId
        };

        const filterQuery = {
            arrayFilters: [{
                'element._id': mongoose.Types.ObjectId(parentId)
            }],
            new: true
        };

        let updateQuery;
        switch (type) {
            case 'city':
                updateQuery = {
                    $push: {
                        'cities': {
                            _id: new mongoose.Types.ObjectId(),
                            city: content.name,
                            shortName: content.shortName,
                            isDefault: content.isDefault,
                            location: content.location,
                            postcodes: []
                        }
                    }
                };
                delete filterQuery.arrayFilters;
                break;
            case 'postcode':
                updateQuery = {
                    $push: {
                        'cities.$[element].postcodes': {
                            _id: new mongoose.Types.ObjectId(),
                            postcode: content.name,
                            areas: []
                        }
                    }
                };
                break;
            case 'area':
                updateQuery = {
                    $push: {
                        'cities.$[].postcodes.$[element].areas': {
                            _id: new mongoose.Types.ObjectId(),
                            area: content.name,
                            places: [],
                            streets: []
                        }
                    }
                };
                break;
            case 'place':
                updateQuery = {
                    $push: {
                        'cities.$[].postcodes.$[].areas.$[element].places': {
                            _id: new mongoose.Types.ObjectId(),
                            place: content.name
                        }
                    }
                };
                break;
            case 'street':
                updateQuery = {
                    $push: {
                        'cities.$[].postcodes.$[].areas.$[element].streets': {
                            _id: new mongoose.Types.ObjectId(),
                            street: content.name
                        }
                    }
                };
                break;
            default:
                break;
        }

        addresses.findOneAndUpdate(searchQuery, updateQuery, filterQuery, (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.success(`UPDATE: (Super Admin) New type ${content.name} (stateId:${stateId})`, result, res);
        });
    }
};


module.exports.rename_address = (req, res, next) => {
    const type = req.body.type;
    const content = req.body.content;
    const stateId = req.body.stateId;
    const childId = req.body.childId;

    if (errHan.missingParams([type, content, stateId], req)) {
        return res.status(404).json();
    }

    if (type === 'state') {
        addresses.findOneAndUpdate({
            '_id': stateId
        }, {
            'state': content.name
        }, {
            new: true
        }, (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.success(`UPDATE: (Super Admin) State name to ${content.name} (stateId:${stateId})`, result, res);
        });
    } else {
        if (errHan.missingParams([childId], req)) {
            return res.status(404).json();
        }

        const searchQuery = {
            '_id': stateId
        };

        let updateQuery;
        switch (type) {
            case 'city':
                updateQuery = {
                    'cities.$[element].city': content.name,
                    'cities.$[element].shortName': content.shortName,
                    'cities.$[element].isDefault': content.isDefault,
                    'cities.$[element].location': content.location
                };
                break;
            case 'postcode':
                updateQuery = {
                    'cities.$[].postcodes.$[element].postcode': content.name
                };
                break;
            case 'area':
                updateQuery = {
                    'cities.$[].postcodes.$[].areas.$[element].area': content.name
                };
                break;
            case 'place':
                updateQuery = {
                    'cities.$[].postcodes.$[].areas.$[].places.$[element].place': content.name
                };
                break;
            case 'street':
                updateQuery = {
                    'cities.$[].postcodes.$[].areas.$[].streets.$[element].street': content.name
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

        addresses.findOneAndUpdate(searchQuery, updateQuery, filterQuery, (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.success(`UPDATE: (Super Admin) New ${type} to ${content.name} (stateId:${stateId})`, result, res);
        });
    }
};

module.exports.delete_address = (req, res, next) => {
    const type = req.body.type;
    const stateId = req.body.stateId;
    const parentId = req.body.parentId;
    const childId = req.body.childId;

    if (errHan.missingParams([type, stateId], req)) {
        return res.status(404).json();
    }

    if (type === 'state') {
        addresses.findOneAndDelete({
            '_id': stateId
        }, (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.success(`DELETE: (Super Admin) State document (stateId:${stateId})`, result, res);
        });
    } else {
        if (errHan.missingParams([parentId, childId], req)) {
            return res.status(404).json();
        }
        const searchQuery = {
            '_id': stateId
        };


        const filterQuery = {
            arrayFilters: [{
                'element._id': mongoose.Types.ObjectId(parentId)
            }],
            new: true
        };

        let updateQuery;
        switch (type) {
            case 'city':
                updateQuery = {
                    $pull: {
                        'cities': {
                            '_id': childId
                        }
                    }
                };
                delete filterQuery.arrayFilters;
                break;
            case 'postcode':
                updateQuery = {
                    $pull: {
                        'cities.$[element].postcodes': {
                            '_id': childId
                        }
                    }
                };
                break;
            case 'area':
                updateQuery = {
                    $pull: {
                        'cities.$[].postcodes.$[element].areas': {
                            '_id': childId
                        }
                    }
                };
                break;
            case 'place':
                updateQuery = {
                    $pull: {
                        'cities.$[].postcodes.$[].areas.$[element].places': {
                            '_id': childId
                        }
                    }
                };
                break;
            case 'street':
                updateQuery = {
                    $pull: {
                        'cities.$[].postcodes.$[].areas.$[element].streets': {
                            '_id': childId
                        }
                    }
                };
                break;
            default:
                break;
        }

        addresses.findOneAndUpdate(searchQuery, updateQuery, filterQuery, (err, result) => {
            if (err) {
                return errHan.commonError(err, res);
            }
            return returnHan.success(`DELETE: (Super Admin) ${type} deleted (stateId:${stateId})`, result, res);
        });
    }
};