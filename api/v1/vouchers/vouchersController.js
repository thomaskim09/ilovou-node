const mongoose = require('mongoose');
const isAfter = require('date-fns/isAfter');
const isBefore = require('date-fns/isBefore');
const winston = require('../utils/winston');
const vouchers = require('../vouchers/vouchersModel');
const voucherFun = require('../common/voucherFunction');
const errHan = require('../common/errorHandle');
const imageHan = require('../common/imageHandle');
const comFun = require('../common/commonFunction');
const resFun = require('../common/restaurantFunction');
const returnHan = require('../common/returnHandle');

/*
Voucher status type
OP - Open
HD - Hidden
SO - Sold Out
WG - Wait For Grab
CL - Closed
*/

/*
Front-end vouchy only
LO - Limited Time Over
EX - Expired
*/

module.exports.get_voucher_details = (req, res, next) => {
  const id = req.query.voucherId;

  if (errHan.missingParams([id], req)) {
    return res.status(404).json();
  }

  vouchers.findOne({
    '_id': id
  }, ['restaurantList', 'details'], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    return returnHan.success(`GET: (Admin) Voucher details (vouId:${id})`, result, res);
  });
};

module.exports.get_voucher_list = (req, res, next) => {
  const restaurantId = req.query.restaurantId;
  const type = req.query.type;
  const pageSize = Number(req.query.page_size);
  const pageNum = Number(req.query.page_num);
  const skips = pageSize * (pageNum - 1);

  if (errHan.missingParams([restaurantId, type], req)) {
    return res.status(404).json();
  }

  let statusList;
  let needFields;
  let sortQuery;
  if (type === 'active') {
    sortQuery = {
      'order': 1
    };
    statusList = ['OP', 'HD', 'WG', 'SO'];
    needFields = [
      'details.voucherName',
      'details.newPrice',
      'status',
      'details.startSellingTime',
      'details.soldOutTime',
      'details.voucherRules.validUntil'
    ];
  } else {
    sortQuery = {
      'createdTime': -1
    };
    statusList = ['CL'];
    needFields = [
      'details.voucherName',
      'details.newPrice'
    ];
  }

  vouchers.find({
      'restaurantList': restaurantId,
      'status': {
        $in: statusList
      }
    })
    .select(needFields)
    .sort(sortQuery)
    .limit(pageSize + skips)
    .skip(skips)
    .exec((err, result) => {
      if (err) {
        return errHan.commonError(err, res);
      }

      // Voucher status checking
      if (result.length) {
        result = voucherFun.checkVoucherStatus(result);
      }

      return returnHan.success(`GET: (Admin) Voucher lists ${type} ${pageSize} ${pageNum} (resId:${restaurantId})`, result, res);
    });
};

module.exports.create_voucher = (req, res, next) => {
  const content = req.body;

  if (errHan.missingParams([content], req)) {
    return res.status(404).json();
  }

  // Save image to sub domain
  if (!imageHan.checkIfUrl(content.voucher.voucherImage)) {
    content.voucher.voucherImage = imageHan.uploadBase64File('vou', content.voucher.voucherImage);
  }

  // Save new restaurant to database
  const voucher = new vouchers({
    _id: new mongoose.Types.ObjectId(),
    restaurantId: content.restaurantId,
    restaurantList: content.voucher.restaurantList,
    details: content.voucher,
    status: content.voucher.status,
    order: content.voucher.order
  });

  // Handle possible chinese input
  voucher.details.voucherName = comFun.decodeEntities(voucher.details.voucherName);
  voucher.details.voucherRules.customRuleDetails = voucher.details.voucherRules.customRuleDetails.map(val => comFun.decodeEntities(val));

  // Change restaurant status if create voucher
  if (voucher.order === 0) {
    resFun.changeRestaurantStatus(content.restaurantId, 'OP', res);
  }

  voucher.save((err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }
    const final = {
      voucherId: voucher._id
    };
    return returnHan.success(`CREATE: (Admin) Voucher (resId:${voucher.restaurantId} vouId:${voucher._id} order:${voucher.order})`, final, res);
  });
};

module.exports.change_voucher_status = (req, res, next) => {
  const voucherId = req.query.voucherId;
  const status = req.body.status;
  const restaurantId = req.body.restaurantId;
  const restaurantStatus = req.body.restaurantStatus;

  if (errHan.missingParams([voucherId, status], req)) {
    return res.status(404).json();
  }

  // Change restaurant status based on voucher quantity
  if (restaurantStatus) {
    resFun.changeRestaurantStatus(restaurantId, restaurantStatus, res);
  }

  vouchers.findOneAndUpdate({
    '_id': voucherId
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
    return returnHan.successOnly(`UPDATE: (Admin) Voucher status to ${status} (vouId:${voucherId})`, res);
  });
};

module.exports.update_voucher_order = (req, res, next) => {
  const idList = req.body.idList.map(id => mongoose.Types.ObjectId(id));

  if (errHan.missingParams([idList], req)) {
    return res.status(404).json();
  }

  const bulkOps = [];
  let searchQuery;
  let updateQuery;
  let upsertDoc;
  for (let i = 0; i < idList.length; ++i) {
    searchQuery = {
      '_id': mongoose.Types.ObjectId(idList[i])
    };
    updateQuery = {
      $set: {
        'order': i
      }
    };
    upsertDoc = {
      'updateOne': {
        'filter': searchQuery,
        'update': updateQuery
      }
    };
    bulkOps.push(upsertDoc);
  }
  vouchers.collection.bulkWrite(bulkOps)
    .then(result => returnHan.successOnly(`BULK UPDATE: (Admin) Voucher order (vouchers:[${idList}])`, res))
    .catch(err => errHan.commonError(err, res));
};

module.exports.get_voucher_list_user = (req, res, next) => {
  const restaurantId = req.query.restaurantId;
  const type = req.query.type;

  if (errHan.missingParams([restaurantId, type], req)) {
    return res.status(404).json();
  }

  let returnFields;
  if (type === 'detailsTitle') {
    returnFields = [
      'status',
      'details.newPrice',
      'details.basePrice',
      'details.quantitySold',
      'details.voucherImage',
      'details.voucherName',
      'details.suitablePax'
    ];
  } else if (type === 'details') {
    returnFields = [
      'status',
      'details.newPrice',
      'details.basePrice',
      'details.quantitySold',
      'details.voucherImage',
      'details.voucherName'
    ];
  } else if (type === 'title') {
    returnFields = [
      'details.newPrice',
      'details.suitablePax'
    ];
  }

  vouchers.find({
      'restaurantList': restaurantId,
      'status': {
        $in: ['OP', 'WG', 'SO']
      }
    })
    .sort({
      'order': 1
    })
    .select(returnFields)
    .exec((err, result) => {
      if (err) {
        return errHan.commonError(err, res);
      }

      // Change restaurant status if no voucher
      if (result.length === 0) {
        resFun.changeRestaurantStatus(restaurantId, 'NV', res);
      }

      return returnHan.success(`GET: (User) Voucher lists length:${result.length} type:${type} (resId:${restaurantId})`, result, res);
    });
};

module.exports.get_voucher_details_user = (req, res, next) => {
  const voucherId = req.query.voucherId;
  const userId = req.query.userId;

  if (errHan.missingParams([voucherId], req)) {
    return res.status(404).json();
  }

  vouchers.findOne({
    '_id': voucherId
  }, {
    'restaurantId': 1,
    'restaurantList': 1,
    'details': 1,
    'status': 1
  }, (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }

    // Only return matched userId's quantityPurchased
    const history = result.details.userPurchaseHistory;
    if (history && history.length) {
      result.details.userPurchaseHistory = history.filter(o => String(o.userId) === userId);
    }

    return returnHan.success(`GET: (User) Voucher details (vouId:${voucherId} userId:${userId})`, result, res);
  });
};

module.exports.get_all_voucher_list = (req, res, next) => {
  vouchers.find({
    'status': {
      $ne: 'CL'
    }
  }, ['details.voucherName'], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }

    return returnHan.success(`GET: (Super Admin) All voucher list active`, result, res);
  });
};

module.exports.check_voucher_availability = (req, res, next) => {
  const voucherId = req.query.voucherId;
  const userId = req.query.userId;
  const quantity = req.body.quantity;

  if (errHan.missingParams([voucherId], req)) {
    return res.status(404).json();
  }

  vouchers.findOne({
    '_id': voucherId
  }, [
    'status',
    'details.soldOutTime',
    'details.quantitySold',
    'details.limitedQuantity',
    'details.limitedQuantityPerUser',
    'details.userPurchaseHistory',
    'details.limitedEndTime',
    'details.startSellingTime',
    'details.voucherRules.validUntil'
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }

    function denied(text) {
      winston.warn(`CHECK: (User) ${text} (vouId: ${voucherId} userId:${userId})`);
      return res.status(400).json({
        error: text
      });
    }

    // Check status
    if (result.status === 'CL' || result.status === 'SO' || result.status === 'HD') {
      return denied('Voucher is not available');
    }

    const de = result.details;
    // Check if sold out
    if (de.soldOutTime) {
      return denied('Voucher has been sold out');
    }
    // Check if sold out user specifically
    if (de.limitedQuantityPerUser && de.userPurchaseHistory) {
      const filtered = de.userPurchaseHistory.filter(val => String(val.userId) === String(userId));
      if (filtered.length) {
        const left = de.limitedQuantityPerUser - filtered[0].quantityPurchased;
        if (left < quantity) {
          return denied('Voucher has exceeded your purchase limit');
        }
      }
    }
    // Check if sold out
    if (de.limitedQuantity) {
      if (de.quantitySold >= de.limitedQuantity) {
        return denied('Voucher has been sold out');
      }
    }
    // Check limited time
    if (de.limitedEndTime) {
      if (isAfter(new Date(), de.limitedEndTime)) {
        return denied('Voucher has passed limited time');
      }
    }
    // Check start time
    if (de.startSellingTime) {
      if (isBefore(new Date(), de.startSellingTime)) {
        return denied('Voucher is not for sell yet');
      }
      if (result.status === 'WG') {
        voucherFun.updateVoucherStatus(voucherId, 'OP', res, 'Grab time started');
      }
    }
    // Check expiry date
    if (de.voucherRules.validUntil) {
      if (isAfter(new Date(), de.voucherRules.validUntil)) {
        voucherFun.updateVoucherStatus(voucherId, 'CL', res, 'Valid until expired');
        return denied('Voucher has expired');
      }
    }

    const final = {
      ticketId: new mongoose.Types.ObjectId()
    };
    return returnHan.success(`CHECK: (User) Voucher details (vouId:${voucherId} userId:${userId})`, final, res);
  });
};

module.exports.check_voucher_free = (req, res, next) => {
  const voucherId = req.query.voucherId;

  if (errHan.missingParams([voucherId], req)) {
    return res.status(404).json();
  }

  vouchers.findOne({
    '_id': voucherId
  }, [
    'details.newPrice'
  ], (err, result) => {
    if (err) {
      return errHan.commonError(err, res);
    }

    function denied(text) {
      winston.warn(`CHECK: (User) ${text} (vouId: ${voucherId})`);
      return res.status(400).json({
        error: text
      });
    }

    if (result.details.newPrice !== 0) {
      return denied('Voucher is not free');
    }

    return returnHan.successOnly(`CHECK: (User) Voucher free (vouId:${voucherId})`, res);
  });
};

module.exports.update_quantity_sold_only = (req, res, next) => {
  const voucherId = req.query.voucherId;
  const userId = req.query.userId;
  const quantity = req.body.quantity;

  if (errHan.missingParams([voucherId, userId, quantity], req)) {
    return res.status(404).json();
  }

  voucherFun.updateMonitorQuantitySold(voucherId, userId, quantity, res);
};