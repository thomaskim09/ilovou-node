const mongoose = require('mongoose');
const loSortBy = require('lodash/sortBy');
const loIsEqual = require('lodash/isEqual');
const loDifference = require('lodash/difference');
const winston = require('../utils/winston');
const restaurants = require('./restaurantsModel');
const admins = require('../admins/adminsModel');
const tags = require('../tags/tagsModel');
const errHan = require('../common/errorHandle');
const imageHan = require('../common/imageHandle');
const comFun = require('../common/commonFunction');
const returnHan = require('../common/returnHandle');

/*
Status type
OP - Open
HD - Hidden
NV - No Voucher
CL - Closed
*/

module.exports.get_restaurant_details = (req, res, next) => {
  const id = req.query.restaurantId;

  if (errHan.missingParams([id], req)) {
    return res.status(404).json();
  }

  restaurants.findOne({
    '_id': id
  }, [
    'details',
    'searchTags'
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    return returnHan.success(`GET: (Admin) Restaurant details (resId:${id})`, result, res);
  });
};

function bulkUpdateTagCounter(operations, res) {
  if (operations.length === 0) {
    return;
  }
  // Bulk update operations
  const bulkOps = [];
  let resultString = '';
  operations.map((val) => {
    resultString += `(${val.list.length} ${val.type} ${val.increment}) `;
    val.list.map((val2) => {
      const searchQuery = {};
      const incQuery = {};
      searchQuery[`details.${val.type}._id`] = mongoose.Types.ObjectId(val2);
      incQuery[`details.${val.type}.$.counter`] = val.increment;
      const updateQuery = {
        '$inc': incQuery
      };
      bulkOps.push({
        'updateOne': {
          'filter': searchQuery,
          'update': updateQuery
        }
      });
      return undefined;
    });
    return undefined;
  });

  tags.collection.bulkWrite(bulkOps).then((result) => {
    winston.info(`BULK UPDATE: (Admin) ${resultString}`);
  }).catch(err => errHan.commonError(err, res));
}

module.exports.create_restaurant = (req, res, next) => {
  const adminId = req.body.adminId;
  const details = req.body.restaurant;
  const status = req.body.status;

  if (errHan.missingParams([adminId, details, status], req)) {
    return res.status(404).json();
  }

  // Save image to sub domain
  if (!imageHan.checkIfUrl(details.restaurantImage)) {
    details.restaurantImage = imageHan.uploadBase64File('res', details.restaurantImage);
  }

  // Save gallery to sub domain
  if (details.restaurantImageList.length) {
    details.restaurantImageList.map((val) => {
      if (!imageHan.checkIfUrl(val)) {
        details.restaurantImage = imageHan.uploadBase64File('res_sub', val);
      }
    });
  }

  // Process possible chinese input
  details.restaurantName = comFun.decodeEntities(details.restaurantName);
  details.fullAddress = comFun.decodeEntities(details.fullAddress);
  details.shortAreaName = comFun.decodeEntities(details.shortAreaName);

  // Prepare restaurant object
  const restaurantRecord = new restaurants({
    _id: new mongoose.Types.ObjectId(),
    details: details,
    searchTags: details.searchTags,
    status: status
  });

  // Save the new restaurantId to admin
  admins.findOneAndUpdate({
    '_id': adminId
  }, {
    'restaurantId': restaurantRecord._id,
    'restaurantList': [restaurantRecord._id]
  }, {
    projection: {
      '_id': 1
    }
  }, (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    winston.info(`UPDATE: (Admin) Restaurant id saved to admin (adminId:${adminId} resName:${restaurantRecord.details.restaurantName})`);
  });

  // Increment foodType & restaurantType counter
  const bulkList = [];
  const foodTypeList = details.searchTags;
  bulkList.push({
    type: 'foodTypes',
    list: foodTypeList,
    increment: 1
  });
  const resTypeId = details.restaurantType;
  bulkList.push({
    type: 'restaurantTypes',
    list: [resTypeId],
    increment: 1
  });
  bulkUpdateTagCounter(bulkList, res);

  // Save new restaurant to database
  restaurantRecord.save((err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    const final = {
      restaurantId: restaurantRecord._id,
      restaurantName: restaurantRecord.details.restaurantName,
      restaurantImage: restaurantRecord.details.restaurantImage,
      restaurantImageList: restaurantRecord.details.restaurantImageList
    };
    return returnHan.success(`CREATE: (Admin) New restaurant (adminId:${adminId} resId:${final.restaurantId} resName:${final.restaurantName})`, final, res);
  });
};

module.exports.update_restaurant = (req, res, next) => {
  const restaurantId = req.query.restaurantId;
  const details = req.body;
  const searchTags = req.body.searchTags;

  if (errHan.missingParams([restaurantId, details, searchTags], req)) {
    return res.status(404).json();
  }

  // Find search tags to compare
  restaurants.findOne({
    '_id': restaurantId
  }, [
    'searchTags',
    'details.restaurantType',
    'details.restaurantImage',
    'details.restaurantImageList'
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    winston.info(`GET: (Admin) Restaurant's searchTags and restaurantType (resId:${restaurantId})`);

    // Save image to sub domain
    if (!imageHan.checkIfUrl(details.restaurantImage)) {
      details.restaurantImage = imageHan.uploadBase64File('res', details.restaurantImage);

      // Delete previous image from sub domain
      if (imageHan.checkIfUrl(result.details.restaurantImage)) {
        imageHan.deleteFile(result.details.restaurantImage);
      }
    }

    // Save gallery to sub domain
    const newList = details.restaurantImageList;
    const allImageList = [];
    let oldList = result.details.restaurantImageList;
    if (newList.length) {
      newList.map((val) => {
        if (!imageHan.checkIfUrl(val)) {
          const path = imageHan.uploadBase64File('res_sub', val);
          allImageList.push(path);
        } else {
          oldList = oldList.filter(val2 => (val2 !== val));
          allImageList.push(val);
        }
      });
    }
    if (oldList.length) {
      oldList.map((val) => {
        // Delete previous image from sub domain
        if (imageHan.checkIfUrl(val)) {
          imageHan.deleteFile(val);
        }
      });
    }
    details.restaurantImageList = allImageList;

    // Bulk update searchTags counter
    const bulkList = [];
    const oldSearchTags = loSortBy(result.searchTags);
    const newSearchTags = loSortBy(searchTags);
    const oldSearchTagsString = oldSearchTags.map(id => String(id));
    if (!(loIsEqual(oldSearchTagsString, newSearchTags))) {
      const incList = loDifference(newSearchTags, oldSearchTagsString);
      const decList = loDifference(oldSearchTagsString, newSearchTags);
      if (incList.length) {
        bulkList.push({
          type: 'foodTypes',
          list: incList,
          increment: 1
        });
      }
      if (decList.length) {
        bulkList.push({
          type: 'foodTypes',
          list: decList,
          increment: -1
        });
      }
    }

    // Bulk update restaurantType counter
    const oldResTypeId = result.details.restaurantType;
    const newResTypeId = details.restaurantType;
    if (String(newResTypeId) !== String(oldResTypeId)) {
      bulkList.push({
        type: 'restaurantTypes',
        list: [newResTypeId],
        increment: 1
      });
      if (oldResTypeId) {
        bulkList.push({
          type: 'restaurantTypes',
          list: [oldResTypeId],
          increment: -1
        });
      }
    }
    bulkUpdateTagCounter(bulkList, res);

    // Process possible chinese input
    details.restaurantName = comFun.decodeEntities(details.restaurantName);
    details.shortAreaName = comFun.decodeEntities(details.shortAreaName);

    // update restaurant's info
    restaurants.findOneAndUpdate({
      '_id': restaurantId
    }, {
      'details': details,
      'searchTags': searchTags
    }, {
      projection: {
        '_id': 1
      }
    }, (err1, result1) => {
      if (err1) {
        return errHan.commonError(err1, res);
      }
      const final = {
        restaurantImage: details.restaurantImage,
        restaurantImageList: details.restaurantImageList
      };
      return returnHan.success(`UPDATE: (Admin) Restaurant details (resId:${restaurantId})`, final, res);
    });
  });
};

module.exports.get_restaurant_details_user = (req, res, next) => {
  const id = req.query.restaurantId;
  const type = req.body.type;

  if (errHan.missingParams([id, type], req)) {
    return res.status(404).json();
  }

  let projectQuery;
  if (type === 'details') {
    projectQuery = {
      'details': 1,
      'restaurantType': {
        $arrayElemAt: ['$types.details.restaurantTypes.name', 0]
      },
      'feature': {
        $arrayElemAt: ['$admins.packageDetails.feature', 0]
      },
      'hasMenu': {
        $arrayElemAt: ['$menus.menuSettings.hasMenu', 0]
      },
      'orderMode': {
        $arrayElemAt: ['$menus.menuSettings.modeDetails.orderMode', 0]
      },
      'hasReservation': '$reservationSettings.hasReservation',
      'noticeContent': '$reservationSettings.noticeContent',
      'holidays': '$reservationSettings.holidays'
    };
  } else if (type === 'segment') {
    projectQuery = {
      'details.restaurantImage': 1,
      'details.restaurantName': 1,
      'details.rating': 1,
      'details.shortAreaName': 1,
      'details.contact': 1,
      'details.fullAddress': 1,
      'details.restaurantType': {
        $arrayElemAt: ['$types.details.restaurantTypes.name', 0]
      }
    };
  }

  restaurants.aggregate([{
      $match: {
        '_id': mongoose.Types.ObjectId(id)
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
      $lookup: {
        from: 'menus',
        localField: '_id',
        foreignField: 'restaurantList',
        as: 'menus'
      }
    },
    {
      $lookup: {
        from: 'admins',
        localField: '_id',
        foreignField: 'restaurantList',
        as: 'admins'
      }
    },
    {
      $project: projectQuery
    }
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    return returnHan.success(`GET: (User) Restaurant details (resId:${id})`, result[0], res);
  });
};

module.exports.get_restaurant_name = (req, res, next) => {
  const id = req.query.restaurantId;

  if (errHan.missingParams([id], req)) {
    return res.status(404).json();
  }

  restaurants.findOne({
    '_id': id
  }, [
    'details.restaurantName'
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    const name = result ? result.details.restaurantName : undefined;
    return returnHan.success(`GET: (User) Restaurant name (resId:${id} resName:${name})`, result, res);
  });
};