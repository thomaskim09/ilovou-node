const bcrypt = require('bcrypt');
const sanitize = require('mongo-sanitize');
const mongoose = require('mongoose');
const winston = require('../utils/winston');
const fcmController = require('../notifications/fcmController');
const errHan = require('../common/errorHandle');
const comFun = require('../common/commonFunction');
const menus = require('../menus/menusModel');
const admins = require('./adminsModel');
const restaurants = require('../restaurants/restaurantsModel');
const vouchers = require('../vouchers/vouchersModel');
const returnHan = require('../common/returnHandle');

/*
Status type
OP - Open
CL - Closed
HD - Hidden (Demo or Preserve)
*/

/*
Package type
01 - Bronze
02 - Gold
03 - Platinum
*/

/*
Feature type
1 - Voucher only
3 - Voucher, Reservation & Ordering
*/

// Internal file function start
module.exports.denied = (text, message, res) => {
  winston.error(`${text}`);
  return res.status(404).json({
    message: message
  });
};

function handleDeviceToken(adminId, deviceToken, fingerprint, deviceDetails) {
  if (!deviceToken) {
    return undefined;
  }
  const filteredTokenList = deviceDetails.filter(val => val.token === deviceToken);
  if (filteredTokenList.length) {
    return filteredTokenList[0].token;
  }
  if (deviceDetails.length >= 2) {
    deviceDetails.shift();
    deviceDetails.push({
      token: deviceToken,
      fingerprint: fingerprint
    });
    fcmController.update_admin_fcm_device(adminId, deviceDetails);
    return deviceToken;
  }
  fcmController.register_admin_fcm_device(adminId, deviceToken, fingerprint);
  return deviceToken;
}
// Internal file function end

module.exports.login = (req, res, next) => {
  const type = req.query.type;
  const username = sanitize(req.body.username);
  const password = sanitize(req.body.password);
  const deviceToken = req.body.deviceToken;
  const fingerprint = req.body.fingerprint;

  if (errHan.missingParams([username, password], req)) {
    return res.status(404).json();
  }

  let projectQuery;
  if (type === 'web') {
    projectQuery = {
      'password': '$details.password',
      'restaurantId': 1,
      'restaurantList': 1,
      'feature': '$packageDetails.feature',
      'restaurantName': {
        $arrayElemAt: ['$restaurants.details.restaurantName', 0]
      },
      'hasReservation': {
        $arrayElemAt: ['$restaurants.reservationSettings.hasReservation', 0]
      },
      'menuId': {
        $arrayElemAt: ['$menus._id', 0]
      }
    };
  } else if (type === 'mobile') {
    projectQuery = {
      'contact': '$companyDetails.contact',
      'email': '$companyDetails.email',
      'password': '$details.password',
      'feature': '$packageDetails.feature',
      'restaurantId': 1,
      'deviceDetails': 1,
      'restaurantName': {
        $arrayElemAt: ['$restaurants.details.restaurantName', 0]
      },
      'hasReservation': {
        $arrayElemAt: ['$restaurants.reservationSettings.hasReservation', 0]
      },
      'hasMenu': {
        $arrayElemAt: ['$menus.menuSettings.hasMenu', 0]
      },
      'menuId': {
        $arrayElemAt: ['$menus._id', 0]
      }
    };
  } else if (type === 'pwa') {
    projectQuery = {
      'password': '$details.password',
      'restaurantId': 1,
      'restaurantName': {
        $arrayElemAt: ['$restaurants.details.restaurantName', 0]
      }
    };
  }

  admins.aggregate([{
      $match: {
        'details.username': username,
        'status': {
          $ne: 'CL'
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
      $lookup: {
        from: 'menus',
        localField: 'restaurantId',
        foreignField: 'restaurantList',
        as: 'menus'
      }
    },
    {
      $project: projectQuery
    }
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    if (result.length < 1) {
      return this.denied(`ERROR: Login failed - No username found (username:${username})`, 'Authentication failed', res);
    }
    const re = result[0];
    winston.info(`GET: (Admin) Admin details during login (username:${username})`);

    // Compare password
    bcrypt.compare(password, re.password, (err1, result1) => {
      if (err1) {
        return this.denied(err1, 'Authentication failed', res);
      }
      if (result1 === false) {
        return this.denied(`ERROR: Login failed - Incorrect Password (username:${username})`, 'Authentication failed', res);
      }
      admins.findOneAndUpdate({
        'details.username': username
      }, {
        'lastLogin': new Date()
      }, {
        projection: {
          '_id': 1
        }
      }, (err2, result2) => {
        if (err2) {
          return errHan.commonError(err2, res);
        }
        let final;
        let text;
        if (type === 'web') {
          final = {
            _id: re._id,
            restaurantId: re.restaurantId,
            restaurantList: re.restaurantList,
            restaurantName: re.restaurantName,
            menuId: re.menuId,
            hasReservation: re.hasReservation,
            feature: re.feature
          };
          text = `UPDATE: (Admin) Login successfully (adminId:${re._id} username:${username} type:${type})`;
        } else if (type === 'mobile') {
          const filteredToken = handleDeviceToken(re._id, deviceToken, fingerprint, re.deviceDetails);

          final = {
            _id: re._id,
            contact: re.contact,
            email: re.email,
            restaurantId: re.restaurantId,
            restaurantName: re.restaurantName,
            hasMenu: re.hasMenu,
            menuId: re.menuId,
            hasReservation: re.hasReservation,
            feature: re.feature,
            deviceToken: deviceToken || filteredToken,
            fingerprint: fingerprint
          };
          text = `UPDATE: (Admin) Login successfully (adminId:${re._id} username:${username} type:${type} fingerprint:${fingerprint})`;
        } else if (type === 'pwa') {
          final = {
            _id: re._id,
            restaurantId: re.restaurantId,
            restaurantName: re.restaurantName
          };
          text = `UPDATE: (Admin) Login successfully (adminId:${re._id} username:${username} type:${type})`;
        }
        return returnHan.success(text, final, res);
      });
    });
  });
};

module.exports.logout = (req, res, next) => {
  const adminId = req.body.adminId;
  const deviceToken = req.body.deviceToken;

  if (errHan.missingParams([adminId, deviceToken], req)) {
    return res.status(404).json();
  }

  admins.findOneAndUpdate({
    '_id': adminId
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
  }, (err, result1) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    return returnHan.successOnly(`REMOVE: (Admin) Device token (adminId:${adminId})`, res);
  });
};

module.exports.get_company_details = (req, res, next) => {
  const adminId = req.query.adminId;

  if (errHan.missingParams([adminId], req)) {
    return res.status(404).json();
  }

  admins.findOne({
    '_id': adminId
  }, [
    'companyDetails.companyName',
    'companyDetails.registrationNo',
    'companyDetails.sstId',
    'companyDetails.contact',
    'companyDetails.email',
    'companyDetails.address'
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    return returnHan.success(`GET: (Admin) Company details (adminId:${adminId})`, result, res);
  });
};

module.exports.check_admin_status = (req, res, next) => {
  const adminId = req.query.adminId;

  if (errHan.missingParams([adminId], req)) {
    return res.status(404).json();
  }

  admins.findOne({
    '_id': adminId
  }, ['status'], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    let isOpen;
    if (!result) {
      isOpen = false;
    } else {
      isOpen = (result.status !== 'CL');
    }

    return returnHan.success(`CHECK: (Admin) Admin status isOpen:${isOpen} (adminId:${adminId})`, isOpen, res);
  });
};

module.exports.check_admin_feature = (req, res, next) => {
  const adminId = req.query.adminId;

  if (errHan.missingParams([adminId], req)) {
    return res.status(404).json();
  }

  admins.findOne({
    '_id': adminId
  }, ['packageDetails.feature'], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    let isOpen;
    if (!result) {
      isOpen = false;
    } else {
      isOpen = (result.packageDetails.feature === '3');
    }

    return returnHan.success(`CHECK: (Admin) Admin feature isOpen:${isOpen} (adminId:${adminId})`, isOpen, res);
  });
};

// Super admins
module.exports.sign_up = (req, res, next) => {
  const username = sanitize(req.body.username);
  const password = sanitize(req.body.password);
  const status = req.body.status;
  const packageDetails = req.body.packageDetails;
  const companyDetails = req.body.companyDetails;

  if (errHan.missingParams([username, password, status], req)) {
    return res.status(404).json();
  }

  // Process possible chinese input
  companyDetails.address = comFun.decodeEntities(companyDetails.address);

  bcrypt.hash(password, 10, (err1, hash) => {
    if (err1) {
      return errHan.commonError(err1, res);
    }
    const adminRecord = new admins({
      _id: new mongoose.Types.ObjectId(),
      details: {
        username: username,
        password: hash
      },
      status: status,
      packageDetails: packageDetails,
      companyDetails: companyDetails,
      deviceDetails: []
    });
    adminRecord.save((err2, result1) => {
      if (err2) {
        return errHan.commonError(err2, res);
      }
      return returnHan.successOnly(`CREATE: (Super Admin) New admin (adminId:${adminRecord._id} username:${username})`, res);
    });
  });
};

module.exports.sign_up_future = (req, res, next) => {
  const username = sanitize(req.body.username);
  const password = sanitize(req.body.password);
  const status = req.body.status;
  const packageDetails = req.body.packageDetails;
  const companyDetails = req.body.companyDetails;

  if (errHan.missingParams([username, password, status], req)) {
    return res.status(404).json();
  }

  const restaurantRecord = new restaurants({
    _id: new mongoose.Types.ObjectId(),
    status: status
  });

  restaurantRecord.save((err2, result) => {
    if (err2) {
      return errHan.commonError(err2, res);
    }
    winston.info(`CREATE: (Super Admin) New future restaurant (resId:${restaurantRecord._id} username:${username})`);

    bcrypt.hash(password, 10, (err1, hash) => {
      if (err1) {
        return errHan.commonError(err1, res);
      }
      const adminRecord = new admins({
        _id: new mongoose.Types.ObjectId(),
        restaurantId: restaurantRecord._id,
        restaurantList: [restaurantRecord._id],
        details: {
          username: username,
          password: hash
        },
        packageDetails: packageDetails,
        companyDetails: companyDetails,
        deviceDetails: [],
        status: status
      });
      adminRecord.save((err3, result1) => {
        if (err3) {
          return errHan.commonError(err3, res);
        }
        return returnHan.successOnly(`CREATE: (Super Admin) New future admin (adminId:${adminRecord._id} username:${username})`, res);
      });
    });
  });
};

module.exports.get_admins_list = (req, res, next) => {
  admins.aggregate([{
      $lookup: {
        from: 'restaurants',
        localField: 'restaurantId',
        foreignField: '_id',
        as: 'restaurants'
      }
    },
    {
      $project: {
        'adminId': '$_id',
        'username': '$details.username',
        'adminStatus': '$status',
        'restaurantId': '$restaurantId',
        'restaurantName': {
          $arrayElemAt: ['$restaurants.details.restaurantName', 0]
        },
        'rating': {
          $arrayElemAt: ['$restaurants.details.rating', 0]
        },
        'restaurantStatus': {
          $arrayElemAt: ['$restaurants.status', 0]
        },
        'createdTime': '$createdTime'
      }
    }
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    return returnHan.success(`GET: (Super Admin) Admin List ${result.length}`, result, res);
  });
};

module.exports.get_admins_details = (req, res, next) => {
  const adminId = req.query.adminId;

  if (errHan.missingParams([adminId], req)) {
    return res.status(404).json();
  }

  admins.findOne({
    '_id': adminId
  }, [
    'details',
    'status',
    'restaurantId',
    'packageDetails',
    'companyDetails'
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    return returnHan.success(`GET: (Super Admin) Admin details (adminId:${adminId})`, result, res);
  });
};

module.exports.update_admins_details = (req, res, next) => {
  const updateType = req.body.updateType;
  const adminId = req.body.adminId;
  const restaurantId = req.body.restaurantId;
  const username = req.body.username;
  const password = req.body.password;
  const status = req.body.status;
  const packageDetails = req.body.packageDetails;
  const companyDetails = req.body.companyDetails;

  if (errHan.missingParams([updateType, adminId], req)) {
    return res.status(404).json();
  }

  function updateAdmin(upQuery) {
    admins.findOneAndUpdate({
      '_id': adminId
    }, upQuery, {
      projection: {
        '_id': 1
      }
    }, (err, result) => {
      if (err) {
        return errHan.commonError(err, res);
      }
      return returnHan.successOnly(`UPDATE: (Super Admin) Admin details ${updateType} (adminId:${adminId})`, res);
    });
  }

  function updateRestaurant() {
    restaurants.findOneAndUpdate({
      '_id': restaurantId
    }, {
      'status': status
    }, {
      projection: {
        '_id': 1
      }
    }, (err, result) => {
      if (err) {
        return errHan.commonError(err, res);
      }
      return returnHan.successOnly(`UPDATE: (Super Admin) Restaurant status to ${status} (adminId:${adminId})`, res);
    });
  }

  function updateMenu() {
    menus.findOneAndUpdate({
      'restaurantList': restaurantId
    }, {
      'status': status
    }, {
      projection: {
        '_id': 1
      }
    }, (err, result) => {
      if (err) {
        return errHan.commonError(err, res);
      }
      return returnHan.successOnly(`UPDATE: (Super Admin) Menu status to ${status} (adminId:${adminId})`, res);
    });
  }

  let updateQuery;
  switch (updateType) {
    case 'username': {
      updateQuery = {
        $set: {
          'details.username': username
        }
      };
      updateAdmin(updateQuery);
      break;
    }
    case 'password': {
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          return errHan.commonError(err, res);
        }
        updateQuery = {
          $set: {
            'details.password': hash
          }
        };
        updateAdmin(updateQuery);
      });
      break;
    }
    case 'status': {
      updateQuery = {
        $set: {
          'status': status
        }
      };
      updateAdmin(updateQuery);
      updateMenu();
      updateRestaurant();
      break;
    }
    case 'subscription': {
      updateQuery = {
        $set: {
          'packageDetails.subscription': packageDetails.subscription
        }
      };
      updateAdmin(updateQuery);
      break;
    }
    case 'feature': {
      updateQuery = {
        $set: {
          'packageDetails.feature': packageDetails.feature
        }
      };
      updateAdmin(updateQuery);
      break;
    }
    case 'company': {
      updateQuery = {
        $set: {
          'companyDetails.companyName': companyDetails.companyName,
          'companyDetails.registrationNo': companyDetails.registrationNo,
          'companyDetails.contact': companyDetails.contact,
          'companyDetails.email': companyDetails.email,
          'companyDetails.sstId': companyDetails.sstId,
          'companyDetails.address': companyDetails.address
        }
      };
      updateAdmin(updateQuery);
      break;
    }
    case 'bank': {
      updateQuery = {
        $set: {
          'companyDetails.bankType': companyDetails.bankType,
          'companyDetails.bankAccountName': companyDetails.bankAccountName,
          'companyDetails.bankAccountNumber': companyDetails.bankAccountNumber
        }
      };
      updateAdmin(updateQuery);
      break;
    }
    default:
      break;
  }
};

module.exports.get_restaurant_list = (req, res, next) => {
  const adminId = req.query.adminId;

  if (errHan.missingParams([adminId], req)) {
    return res.status(404).json();
  }

  admins.aggregate([{
      $match: {
        '_id': mongoose.Types.ObjectId(adminId)
      }
    },
    {
      $lookup: {
        from: 'restaurants',
        localField: 'restaurantList',
        foreignField: '_id',
        as: 'restaurants'
      }
    },
    {
      $project: {
        '_id': '$restaurants._id',
        'restaurantName': '$restaurants.details.restaurantName'
      }
    }
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    const final = [];
    const length = result[0]._id.length;
    for (let i = 0; i < length; i++) {
      final.push({
        _id: result[0]._id[i],
        name: result[0].restaurantName[i]
      });
    }
    return returnHan.success(`GET: (Admin) Admin restaurant list (adminId:${adminId})`, final, res);
  });
};

module.exports.check_branch_vouchers = (req, res, next) => {
  let restaurantList = req.body.restaurantList;

  if (errHan.missingParams([restaurantList], req)) {
    return res.status(404).json();
  }

  restaurantList = comFun.convertArrayToObjectId(restaurantList);

  vouchers.aggregate([{
      $match: {
        'restaurantList': {
          $in: restaurantList
        },
        'status': {
          $ne: 'CL'
        }
      }
    },
    {
      $group: {
        '_id': '$restaurantId',
        'count': {
          $sum: 1
        }
      }
    }
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    const exceedList = [];
    result.map((val) => {
      if (val.count >= 4) {
        exceedList.push(val._id);
      }
    });

    return returnHan.success(`CHECK: (Admin) ${restaurantList.length} restaurants vouchers length (resId:${restaurantList[0]})`, exceedList, res);
  });
};