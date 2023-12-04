const mongoose = require('mongoose');
const versions = require('./versionsModel');
const winston = require('../utils/winston');
const errHan = require('../common/errorHandle');
const returnHan = require('../common/returnHandle');

module.exports.get_app_version = (req, res, next) => {
    versions.find({}, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Super Admin) App list`, result, res);
    });
};

module.exports.get_app_version_details = (req, res, next) => {
    const appName = req.query.appName;

    if (errHan.missingParams([appName], req)) {
        return res.status(404).json();
    }

    versions.findOne({
        'details.appName': appName
    }, ['details.currentVersion'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`GET: (Super Admin) App version details (appName:${appName})`, result, res);
    });
};

module.exports.create_app_version = (req, res, next) => {
    const appName = req.body.appName;
    const version = req.body.version;

    if (errHan.missingParams([appName, version], req)) {
        return res.status(404).json();
    }

    const versionRecord = new versions({
        _id: new mongoose.Types.ObjectId(),
        details: {
            appName: appName,
            currentVersion: version,
            history: {
                version: version,
                date: new Date()
            }
        }
    });

    versionRecord.save((err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        return returnHan.success(`CREATE: (Super Admin) App version (appName:${appName})`, result, res);
    });
};

module.exports.update_app_version = (req, res, next) => {
    const appId = req.query.appId;
    const version = req.body.version;

    if (errHan.missingParams([appId, version], req)) {
        return res.status(404).json();
    }

    versions.findOneAndUpdate({
        '_id': appId
    }, {
        $set: {
            'details.currentVersion': version
        },
        $push: {
            'details.history': {
                'version': version,
                'date': new Date()
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
        return returnHan.successOnly(`UPDATE: (Super Admin) App version (appId:${appId})`, res);
    });
};

module.exports.check_app_version = (req, res, next) => {
    const appName = req.query.appName;
    const version = req.query.version;

    if (errHan.missingParams([appName, version], req)) {
        return res.status(404).json();
    }

    versions.findOne({
        'details.appName': appName
    }, ['details.currentVersion'], (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        let isSame = false;
        if (result.details.currentVersion === version) {
            isSame = true;
        }
        return returnHan.success(`CHECK: App version details ${isSame} (appName:${appName})`, isSame, res);
    });
};