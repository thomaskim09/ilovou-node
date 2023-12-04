 const mongoose = require('mongoose');
 const parse = require('date-fns/parse');
 const isWithinInterval = require('date-fns/isWithinInterval');
 const loSortBy = require('lodash/sortBy');
 const winston = require('../utils/winston');
 const menus = require('./menusModel');
 const errHan = require('../common/errorHandle');
 const imageHan = require('../common/imageHandle');
 const comFun = require('../common/commonFunction');
 const returnHan = require('../common/returnHandle');

 /*
Status type
OP - Open
CL - Closed
HD - Hidden (Demo or Preserve)
*/

 function checkWithinLimitedTime(list) {
     const format = 'HH:mm';
     const result = list.filter((val) => {
         if (val.limitedTimeSection) {
             if (val.limitedTimeSection.startSection) {
                 const start = parse(val.limitedTimeSection.startSection, format, new Date());
                 const end = parse(val.limitedTimeSection.endSection, format, new Date());
                 return (isWithinInterval(new Date(), {
                     start: start,
                     end: end
                 }));
             }
             return true;
         }
         return true;
     });
     return result;
 }

 function getIDNotWithinLimitedTime(list) {
     const format = 'HH:mm';
     const result = list.map((val) => {
         if (val.limitedTimeSection) {
             if (val.limitedTimeSection.startSection) {
                 const start = parse(val.limitedTimeSection.startSection, format, new Date());
                 const end = parse(val.limitedTimeSection.endSection, format, new Date());
                 const isWithin = isWithinInterval(new Date(), {
                     start: start,
                     end: end
                 });
                 if (!isWithin) {
                     return String(val._id);
                 }
             }
         } else {
             return String(val._id);
         }
     });
     return result;
 }

 function decodeRemarkDetails(list) {
     if (!list) {
         return;
     }
     return list.map((val) => {
         val.remarkName = comFun.decodeEntities(val.remarkName);
         val.remarkNameTranslated = comFun.decodeEntities(val.remarkNameTranslated);
         val.remarkShortName = comFun.decodeEntities(val.remarkShortName);
         return val;
     });
 }

 function decodeRemark(list) {
     if (!list) {
         return;
     }
     return list.map((val) => {
         val.remarkTitleTranslated = comFun.decodeEntities(val.remarkTitleTranslated);
         val.remarkDetails = decodeRemarkDetails(val.remarkDetails);
         return val;
     });
 }

 module.exports.create_menu = (req, res, next) => {
     const restaurantId = req.query.restaurantId;
     const settings = req.body.settings;

     if (errHan.missingParams([restaurantId, settings], req)) {
         return res.status(404).json();
     }

     const menuRecord = new menus({
         _id: new mongoose.Types.ObjectId(),
         restaurantId: restaurantId,
         restaurantList: [restaurantId],
         menuSettings: settings,
         status: 'OP'
     });

     // Ensure notice is decoded before creating
     const nd = settings.noticeDetails;
     if (nd.hasNotice) {
         menuRecord.menuSettings.noticeDetails = {
             hasNotice: nd.hasNotice,
             noticeTitle: nd.noticeTitle,
             noticeTitleTranslated: comFun.decodeEntities(nd.noticeTitleTranslated),
             noticeContent: nd.noticeContent,
             noticeContentTranslated: comFun.decodeEntities(nd.noticeContentTranslated)
         };
     }

     menuRecord.save((err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         const final = {
             menuId: result._id
         };
         return returnHan.success(`CREATE: (Admin) New menu (resId:${restaurantId})`, final, res);
     });
 };

 module.exports.get_menu_settings = (req, res, next) => {
     const menuId = req.query.menuId;
     const type = req.query.type;

     if (errHan.missingParams([menuId, type], req)) {
         return res.status(404).json();
     }

     let projectFields = ['menuSettings'];
     if (type === 'mobile') {
         projectFields = [
             'menuSettings.hasMenu',
             'menuSettings.securityDetails.hasTableNoLock',
             'menuSettings.modeDetails',
             'menuSettings.commonDetails.hasCallService',
             'menuSettings.commonDetails.hasNotifyService',
             'menuSettings.totalDetails'
         ];
     }

     menus.findOne({
         '_id': menuId
     }, projectFields, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.success(`GET: (Admin) Menu Settings (menuId:${menuId})`, result, res);
     });
 };

 module.exports.update_settings = (req, res, next) => {
     const menuId = req.query.menuId;
     const settings = req.body.settings;

     if (errHan.missingParams([menuId, settings], req)) {
         return res.status(404).json();
     }

     let updateQuery = {
         'menuSettings': settings
     };
     // Ensure notice is decoded before creating
     const nd = settings.noticeDetails;
     if (nd.hasNotice) {
         updateQuery.menuSettings.noticeDetails = {
             hasNotice: nd.hasNotice,
             noticeTitle: nd.noticeTitle,
             noticeTitleTranslated: comFun.decodeEntities(nd.noticeTitleTranslated),
             noticeContent: nd.noticeContent,
             noticeContentTranslated: comFun.decodeEntities(nd.noticeContentTranslated)
         };
     }
     if (!settings.hasMenu) {
         updateQuery = {
             'menuSettings.hasMenu': settings.hasMenu
         };
     }

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         $set: updateQuery
     }, {
         projection: {
             '_id': 1
         }
     }, (err, result1) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.successOnly(`UPDATE: (Admin) Menu Settings (menuId:${menuId})`, res);
     });
 };

 module.exports.get_remarks = (req, res, next) => {
     const menuId = req.query.menuId;

     if (errHan.missingParams([menuId], req)) {
         return res.status(404).json();
     }

     menus.findOne({
         '_id': menuId
     }, ['remarkShortCuts'], (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.success(`GET: (Admin) Remark details (menuId:${menuId})`, result, res);
     });
 };

 module.exports.add_remarks = (req, res, next) => {
     const menuId = req.query.menuId;
     const content = req.body.content;

     if (errHan.missingParams([menuId, content], req)) {
         return res.status(404).json();
     }

     const object = {
         _id: new mongoose.Types.ObjectId(),
         remarkTitle: content.remarkTitle,
         remarkTitleTranslated: comFun.decodeEntities(content.remarkTitleTranslated),
         remarkType: content.remarkType,
         remarkDetails: decodeRemarkDetails(content.remarkDetails)
     };

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         $push: {
             'remarkShortCuts': object
         }
     }, {
         projection: {
             '_id': 1
         }
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.successOnly(`UPDATE: (Admin) Add new remark (menuId:${menuId} rmkId:${object._id})`, res);
     });
 };

 module.exports.update_remarks = (req, res, next) => {
     const menuId = req.query.menuId;
     const remarkId = req.query.remarkId;
     const content = req.body.content;

     if (errHan.missingParams([menuId, remarkId, content], req)) {
         return res.status(404).json();
     }

     const updateQuery = {
         'remarkShortCuts.$[element].remarkTitle': comFun.decodeEntities(content.remarkTitle),
         'remarkShortCuts.$[element].remarkTitleTranslated': comFun.decodeEntities(content.remarkTitleTranslated),
         'remarkShortCuts.$[element].remarkType': content.remarkType,
         'remarkShortCuts.$[element].remarkDetails': decodeRemarkDetails(content.remarkDetails)
     };

     menus.findOneAndUpdate({
         '_id': menuId
     }, updateQuery, {
         arrayFilters: [{
             'element._id': mongoose.Types.ObjectId(remarkId)
         }],
         projection: {
             '_id': 1
         }
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.successOnly(`UPDATE: (Admin) Remark content (menuId:${menuId})`, res);
     });
 };

 module.exports.delete_remarks = (req, res, next) => {
     const menuId = req.query.menuId;
     const remarkId = req.query.remarkId;

     if (errHan.missingParams([menuId, remarkId], req)) {
         return res.status(404).json();
     }

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         $pull: {
             'itemDetails.$[element].details.remarkAuto': {
                 $in: [mongoose.Types.ObjectId(remarkId)]
             }
         }
     }, {
         arrayFilters: [{
             'element.details.remarkAuto': {
                 $in: [mongoose.Types.ObjectId(remarkId)]
             }
         }]
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         winston.info(`UPDATE: (Admin) Remove remarkId from remark auto (menuId:${menuId} rmkId:${remarkId})`);

         menus.findOneAndUpdate({
             '_id': menuId
         }, {
             $pull: {
                 'remarkShortCuts': {
                     '_id': mongoose.Types.ObjectId(remarkId)
                 }
             }
         }, {
             projection: {
                 '_id': 1
             }
         }, (err1, result2) => {
             if (err) {
                 return errHan.commonError(err1, res);
             }
             return returnHan.successOnly(`UPDATE: (Admin) Remove remark (menuId:${menuId} rmkId:${remarkId})`, res);
         });
     });
 };

 module.exports.get_category_list = (req, res, next) => {
     const menuId = req.query.menuId;

     if (errHan.missingParams([menuId], req)) {
         return res.status(404).json();
     }

     menus.findOne({
             '_id': menuId
         },
         ['categoryDetails'], (err, result) => {
             if (err) {
                 return errHan.commonError(err, res);
             }
             return returnHan.success(`GET: (Admin) Food category list (menuId:${menuId})`, result, res);
         });
 };

 module.exports.create_category = (req, res, next) => {
     const menuId = req.query.menuId;
     const content = req.body.content;

     if (errHan.missingParams([menuId, content], req)) {
         return res.status(404).json();
     }

     const object = {
         _id: new mongoose.Types.ObjectId(),
         categoryName: comFun.decodeEntities(content.categoryName),
         categoryNameTranslated: comFun.decodeEntities(content.categoryNameTranslated),
         limitedTimeSection: content.limitedTimeSection || undefined,
         order: content.order,
         status: content.status
     };

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         $push: {
             'categoryDetails': object
         }
     }, {
         projection: {
             '_id': 1
         }
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.successOnly(`CREATE: (Admin) Category (menuId:${menuId} catId:${object._id})`, res);
     });
 };

 module.exports.update_category = (req, res, next) => {
     const menuId = req.query.menuId;
     const categoryId = req.query.categoryId;
     const content = req.body.content;

     if (errHan.missingParams([menuId, categoryId, content], req)) {
         return res.status(404).json();
     }

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         'categoryDetails.$[element].categoryName': content.categoryName,
         'categoryDetails.$[element].categoryNameTranslated': comFun.decodeEntities(content.categoryNameTranslated),
         'categoryDetails.$[element].limitedTimeSection': content.limitedTimeSection,
         'categoryDetails.$[element].order': content.order,
         'categoryDetails.$[element].status': content.status
     }, {
         arrayFilters: [{
             'element._id': mongoose.Types.ObjectId(categoryId)
         }],
         projection: {
             '_id': 1
         }
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.successOnly(`UPDATE: (Admin) Category details (menuId:${menuId} catId:${categoryId})`, res);
     });
 };

 module.exports.delete_category = (req, res, next) => {
     const menuId = req.query.menuId;
     const categoryId = req.query.categoryId;

     if (errHan.missingParams([menuId, categoryId], req)) {
         return res.status(404).json();
     }

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         $pull: {
             'categoryDetails': {
                 '_id': mongoose.Types.ObjectId(categoryId)
             },
             'itemDetails': {
                 'categoryId': mongoose.Types.ObjectId(categoryId)
             }
         }
     }, {
         projection: {
             '_id': 1,
             'itemDetails': 1
         }
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }

         // Delete previous item image
         result.itemDetails.map((val) => {
             if (String(val.categoryId) === String(categoryId)) {
                 imageHan.deleteFile(val.itemImage);
                 return null;
             }
             return null;
         });

         return returnHan.successOnly(`UPDATE: (Admin) Category deleted with food (menuId:${menuId} catId:${categoryId})`, res);
     });
 };

 module.exports.update_category_status = (req, res, next) => {
     const menuId = req.query.menuId;
     const categoryId = req.query.categoryId;
     const status = req.query.status;

     if (errHan.missingParams([menuId, categoryId, status], req)) {
         return res.status(404).json();
     }

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         'categoryDetails.$[element].status': status
     }, {
         arrayFilters: [{
             'element._id': mongoose.Types.ObjectId(categoryId)
         }],
         projection: {
             '_id': 1
         }
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.successOnly(`UPDATE: (Admin) Category status to ${status} (menuId:${menuId} catId:${categoryId})`, res);
     });
 };

 module.exports.update_category_order = (req, res, next) => {
     const menuId = req.query.menuId;
     const idList = req.body.idList;

     if (errHan.missingParams([menuId, idList], req)) {
         return res.status(404).json();
     }

     const bulkOps = [];
     for (let i = 0; i < idList.length; ++i) {
         const searchQuery = {
             '_id': mongoose.Types.ObjectId(menuId),
             'categoryDetails._id': mongoose.Types.ObjectId(idList[i])
         };
         const updateQuery = {
             $set: {
                 'categoryDetails.$.order': i
             }
         };
         const upsertDoc = {
             'updateOne': {
                 'filter': searchQuery,
                 'update': updateQuery
             }
         };
         bulkOps.push(upsertDoc);
     }
     menus.collection.bulkWrite(bulkOps)
         .then(result => returnHan.successOnly(`BULK UPDATE: (Admin) Category order (menuId:${menuId})`, res))
         .catch(err => errHan.commonError(err, res));
 };

 module.exports.get_food_list = (req, res, next) => {
     const menuId = req.query.menuId;
     const categoryId = req.query.categoryId;

     if (errHan.missingParams([menuId, categoryId], req)) {
         return res.status(404).json();
     }

     menus.aggregate([{
         $match: {
             '_id': mongoose.Types.ObjectId(menuId)
         }
     }, {
         $project: {
             'itemDetails': {
                 $filter: {
                     input: '$itemDetails',
                     as: 'item',
                     cond: {
                         $eq: ['$$item.categoryId', mongoose.Types.ObjectId(categoryId)]
                     }
                 }
             }
         }
     }, {
         $project: {
             'itemDetails': {
                 '_id': 1,
                 'itemName': 1,
                 'itemNameTranslated': 1,
                 'itemPrice': 1,
                 'order': 1,
                 'status': 1
             }
         }
     }, {
         $sort: {
             'itemDetails.order': 1
         }
     }], (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.success(`GET: (Admin) Food list (menuId:${menuId})`, result, res);
     });
 };

 module.exports.create_food = (req, res, next) => {
     const menuId = req.query.menuId;
     const categoryId = req.query.categoryId;
     const con = req.body.content;

     if (errHan.missingParams([menuId, categoryId, con], req)) {
         return res.status(404).json();
     }

     // Save image to sub domain
     if (con.itemImage && !imageHan.checkIfUrl(con.itemImage)) {
         con.itemImage = imageHan.uploadBase64File('fod', con.itemImage);
     }

     const object = {
         _id: new mongoose.Types.ObjectId(),
         categoryId: categoryId,
         itemName: comFun.decodeEntities(con.itemName),
         itemNameTranslated: comFun.decodeEntities(con.itemNameTranslated),
         itemShortName: comFun.decodeEntities(con.itemShortName),
         itemImage: con.itemImage,
         itemCode: con.itemCode,
         itemPrice: con.itemPrice,
         limitedTimeSection: con.limitedTimeSection,
         order: con.order,
         status: con.status
     };

     if (con.details) {
         object.details = {
             needRemark: con.details.needRemark,
             description: con.details.description,
             descriptionTranslated: comFun.decodeEntities(con.details.descriptionTranslated),
             remarkAuto: comFun.convertArrayToObjectId(con.details.remarkAuto),
             remarkManual: decodeRemark(con.details.remarkManual)
         };
         comFun.cleanObjectFields(object.details);
     }

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         $push: {
             'itemDetails': object
         }
     }, {
         projection: {
             '_id': 1
         }
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.successOnly(`CREATE: (Admin) Food (menuId:${menuId} fodId:${object._id})`, res);
     });
 };

 module.exports.get_food_details = (req, res, next) => {
     const menuId = req.query.menuId;
     const foodId = req.query.foodId;

     if (errHan.missingParams([menuId, foodId], req)) {
         return res.status(404).json();
     }

     menus.findOne({
         '_id': menuId,
         'itemDetails._id': foodId
     }, [
         'itemDetails.$'
     ], (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.success(`GET: (Admin) Food details (menuId:${menuId} fodId:${foodId})`, result, res);
     });
 };

 module.exports.update_food = (req, res, next) => {
     const menuId = req.query.menuId;
     const foodId = req.query.foodId;
     const con = req.body.content;

     if (errHan.missingParams([menuId, foodId, con], req)) {
         return res.status(404).json();
     }

     // Save image to sub domain
     if (con.itemImage && !imageHan.checkIfUrl(con.itemImage)) {
         con.itemImage = imageHan.uploadBase64File('fod', con.itemImage);

         // Delete previous image from sub domain
         if (con.itemPreviousImage) {
             imageHan.deleteFile(con.itemPreviousImage);
         }
     }

     const object = {
         categoryId: con.categoryId,
         itemName: comFun.decodeEntities(con.itemName),
         itemNameTranslated: comFun.decodeEntities(con.itemNameTranslated),
         itemShortName: comFun.decodeEntities(con.itemShortName),
         itemImage: con.itemImage,
         itemCode: con.itemCode,
         itemPrice: con.itemPrice,
         order: con.order,
         status: con.status
     };
     if (con.details) {
         object.details = {
             needRemark: con.details.needRemark,
             description: con.details.description,
             descriptionTranslated: comFun.decodeEntities(con.details.descriptionTranslated),
             remarkAuto: comFun.convertArrayToObjectId(con.details.remarkAuto),
             remarkManual: decodeRemark(con.details.remarkManual)
         };
         comFun.cleanObjectFields(object.details);
         if (con.details.remarkManual) {
             if (con.details.remarkManual[0].remarkTitle === '') {
                 delete object.details.remarkManual;
             }
         }
     }
     if (con.limitedTimeSection) {
         object.limitedTimeSection = {
             startSection: con.limitedTimeSection.startSection,
             endSection: con.limitedTimeSection.endSection
         };
     }

     const updateQuery = {
         'itemDetails.$[element].categoryId': object.categoryId,
         'itemDetails.$[element].itemName': object.itemName,
         'itemDetails.$[element].itemNameTranslated': object.itemNameTranslated,
         'itemDetails.$[element].itemShortName': object.itemShortName,
         'itemDetails.$[element].itemImage': object.itemImage,
         'itemDetails.$[element].itemCode': object.itemCode,
         'itemDetails.$[element].itemPrice': object.itemPrice,
         'itemDetails.$[element].limitedTimeSection': object.limitedTimeSection,
         'itemDetails.$[element].order': object.order,
         'itemDetails.$[element].status': object.status,
         'itemDetails.$[element].details': object.details
     };
     comFun.cleanObjectFields(updateQuery);

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         $set: updateQuery
     }, {
         arrayFilters: [{
             'element._id': mongoose.Types.ObjectId(foodId)
         }],
         projection: {
             '_id': 1
         }
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }

         return returnHan.successOnly(`UPDATE: (Admin) Food (menuId:${menuId} fodId:${foodId})`, res);
     });
 };

 module.exports.delete_food = (req, res, next) => {
     const menuId = req.query.menuId;
     const foodId = req.query.foodId;

     if (errHan.missingParams([menuId, foodId], req)) {
         return res.status(404).json();
     }

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         $pull: {
             'itemDetails': {
                 '_id': mongoose.Types.ObjectId(foodId)
             }
         }
     }, {
         projection: {
             '_id': 1,
             'itemDetails': 1
         }
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }

         // Delete previous item image
         result.itemDetails.map((val) => {
             if (String(val._id) === String(foodId)) {
                 imageHan.deleteFile(val.itemImage);
                 return null;
             }
             return null;
         });

         const final = {
             categoryId: result.categoryId
         };
         return returnHan.success(`UPDATE: (Admin) Food deleted (menuId:${menuId} fodId:${foodId})`, final, res);
     });
 };

 module.exports.update_food_status = (req, res, next) => {
     const menuId = req.query.menuId;
     const foodId = req.query.foodId;
     const status = req.query.status;

     if (errHan.missingParams([menuId, foodId, status], req)) {
         return res.status(404).json();
     }

     menus.findOneAndUpdate({
         '_id': menuId
     }, {
         'itemDetails.$[element].status': status
     }, {
         arrayFilters: [{
             'element._id': mongoose.Types.ObjectId(foodId)
         }],
         projection: {
             '_id': 1
         }
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.successOnly(`UPDATE: (Admin) Food status to ${status} (menuId:${menuId} fodId:${foodId})`, res);
     });
 };

 module.exports.update_food_order = (req, res, next) => {
     const menuId = req.query.menuId;
     const idList = req.body.idList;

     if (errHan.missingParams([menuId, idList], req)) {
         return res.status(404).json();
     }

     const bulkOps = [];
     for (let i = 0; i < idList.length; ++i) {
         const searchQuery = {
             '_id': mongoose.Types.ObjectId(menuId),
             'itemDetails._id': mongoose.Types.ObjectId(idList[i])
         };
         const updateQuery = {
             $set: {
                 'itemDetails.$.order': i
             }
         };
         const upsertDoc = {
             'updateOne': {
                 'filter': searchQuery,
                 'update': updateQuery
             }
         };
         bulkOps.push(upsertDoc);
     }
     menus.collection.bulkWrite(bulkOps)
         .then(result => returnHan.successOnly(`BULK UPDATE: (Admin) Food order (menuId:${menuId})`, res))
         .catch(err => errHan.commonError(err, res));
 };

 module.exports.get_all_category_food_list = (req, res, next) => {
     const menuId = req.query.menuId;

     if (errHan.missingParams([menuId], req)) {
         return res.status(404).json();
     }
     menus.findOne({
         '_id': menuId
     }, [
         'itemDetails._id',
         'itemDetails.itemName',
         'itemDetails.itemNameTranslated',
         'itemDetails.categoryId',
         'itemDetails.status',
         'itemDetails.order',
         'categoryDetails._id',
         'categoryDetails.categoryName',
         'categoryDetails.categoryNameTranslated',
         'categoryDetails.status',
         'categoryDetails.order'
     ], (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.success(`GET: (Admin) All food & category list (menuId:${menuId})`, result, res);
     });
 };

 module.exports.get_menu_user = (req, res, next) => {
     const restaurantId = req.query.restaurantId;

     if (errHan.missingParams([restaurantId], req)) {
         return res.status(404).json();
     }

     function getLookUpQuery(collections, foreignFields) {
         return {
             from: collections,
             let: {
                 'id': mongoose.Types.ObjectId(restaurantId)
             },
             pipeline: [{
                 $match: {
                     $expr: {
                         $eq: ['$$id', foreignFields]
                     }
                 }
             }],
             as: collections
         };
     }

     menus.aggregate([{
             $match: {
                 'restaurantList': mongoose.Types.ObjectId(restaurantId),
                 'status': {
                     $ne: 'CL'
                 }
             }
         },
         {
             $lookup: getLookUpQuery('admins', '$restaurantId')
         },
         {
             $lookup: getLookUpQuery('restaurants', '$_id')
         },
         {
             $project: {
                 'categoryDetails': {
                     $filter: {
                         input: '$categoryDetails',
                         as: 'item',
                         cond: {
                             $eq: ['$$item.status', 'OP']
                         }
                     }
                 },
                 'remarkShortCuts': 1,
                 'menuSettings': {
                     'hasMenu': 1,
                     'securityDetails': 1,
                     'commonDetails': {
                         'hasTranslation': 1,
                         'hasCallService': 1,
                         'hasHideTotal': 1
                     },
                     'modeDetails': {
                         'orderMode': 1
                     },
                     'totalDetails': 1,
                     'noticeDetails': 1
                 },
                 'restaurantDetails': {
                     'restaurantName': {
                         $arrayElemAt: ['$restaurants.details.restaurantName', 0]
                     },
                     'status': {
                         $arrayElemAt: ['$restaurants.status', 0]
                     }
                 },
                 'adminDetails': {
                     'feature': {
                         $arrayElemAt: ['$admins.packageDetails.feature', 0]
                     }
                 }
             }
         }
     ], (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         if (result.length === 0) {
             return errHan.commonError('Error: No result', res);
         }

         const re = result[0];
         // Check menu availability
         if (!re.menuSettings.hasMenu || re.adminDetails.feature === '1' || re.restaurantDetails.status === 'NV') {
             return returnHan.success(`WARN: (USER) Menu is not available (resId:${restaurantId})`, false, res);
         }
         // Filter only show category within time section
         re.categoryDetails = checkWithinLimitedTime(re.categoryDetails);
         // Sort category by order
         re.categoryDetails = loSortBy(re.categoryDetails, ['order']);
         // Filter required field
         re.categoryDetails = re.categoryDetails.map(val => ({
             _id: val._id,
             categoryName: val.categoryName,
             categoryNameTranslated: val.categoryNameTranslated
         }));

         return returnHan.success(`GET: (User) Menu Settings & others (resId:${restaurantId})`, re, res);
     });
 };

 module.exports.get_food_list_user = (req, res, next) => {
     const menuId = req.query.menuId;
     const categoryId = req.query.categoryId;
     const pageSize = Number(req.query.page_size);
     const pageNum = Number(req.query.page_num);
     const skips = pageSize * (pageNum - 1);

     if (errHan.missingParams([menuId, categoryId, pageSize, pageNum], req)) {
         return res.status(404).json();
     }

     menus.aggregate([{
             $match: {
                 '_id': mongoose.Types.ObjectId(menuId),
                 'status': {
                     $ne: 'CL'
                 }
             }
         },
         {
             $project: {
                 'itemDetails': {
                     $filter: {
                         input: '$itemDetails',
                         as: 'item',
                         cond: {
                             $and: [{
                                     $eq: ['$$item.categoryId', mongoose.Types.ObjectId(categoryId)]
                                 },
                                 {
                                     $eq: ['$$item.status', 'OP']
                                 }
                             ]
                         }
                     }
                 }
             }
         }
     ], (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         // Sort the items
         let final = loSortBy(result[0].itemDetails, ['order']);
         // Paginate the items
         final = final.slice(skips, pageSize + skips);
         // Filter only show item within time section
         final = checkWithinLimitedTime(final);
         // Filter only required fields
         final = final.map(val => ({
             _id: val._id,
             itemName: val.itemName,
             itemShortName: val.itemShortName,
             itemCode: val.itemCode,
             itemNameTranslated: val.itemNameTranslated,
             itemImage: val.itemImage,
             itemPrice: val.itemPrice,
             details: val.details
         }));

         return returnHan.success(`GET: (User) Category's food list ${pageSize} ${pageNum} (menuId:${menuId} catId:${categoryId})`, final, res);
     });
 };

 module.exports.get_food_search_list_user = (req, res, next) => {
     const menuId = req.query.menuId;

     if (errHan.missingParams([menuId], req)) {
         return res.status(404).json();
     }

     menus.aggregate([{
             $match: {
                 '_id': mongoose.Types.ObjectId(menuId),
                 'status': {
                     $ne: 'CL'
                 }
             }
         },
         {
             $project: {
                 'categoryDetails': {
                     $filter: {
                         input: '$categoryDetails',
                         as: 'item',
                         cond: {
                             $eq: ['$$item.status', 'OP']
                         }
                     }
                 },
                 'itemDetails': {
                     $filter: {
                         input: '$itemDetails',
                         as: 'item',
                         cond: {
                             $eq: ['$$item.status', 'OP']
                         }
                     }
                 }
             }
         }
     ], (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         const re = result[0];
         // Filter only category within time section
         const idList = getIDNotWithinLimitedTime(re.categoryDetails);
         // Filter only within category time section
         re.itemDetails = re.itemDetails.filter(val => idList.includes(String(val.categoryId)));
         // Filter only item within time section
         re.itemDetails = checkWithinLimitedTime(re.itemDetails);
         // Filter only required fields
         const final = re.itemDetails.map(val => ({
             _id: val._id,
             itemName: val.itemName,
             itemNameTranslated: val.itemNameTranslated,
             itemPrice: val.itemPrice
         }));

         return returnHan.success(`GET: (User) Food Search list (menuId:${menuId})`, final, res);
     });
 };

 module.exports.get_food_details_user = (req, res, next) => {
     const menuId = req.query.menuId;
     const foodId = req.query.foodId;

     if (errHan.missingParams([menuId, foodId], req)) {
         return res.status(404).json();
     }

     menus.findOne({
         '_id': menuId,
         'status': {
             $ne: 'CL'
         },
         'itemDetails._id': foodId
     }, [
         'itemDetails.$'
     ], (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         // Filter only show item within time section
         let final = checkWithinLimitedTime(result.itemDetails);
         // Filter only required fields
         final = final.map(val => ({
             _id: val._id,
             itemName: val.itemName,
             itemNameTranslated: val.itemNameTranslated,
             itemImage: val.itemImage,
             itemPrice: val.itemPrice,
             details: val.details
         }));

         return returnHan.success(`GET: (User) Food details (menuId:${menuId} fodId:${foodId})`, final, res);
     });
 };

 module.exports.link_menu = (req, res, next) => {
     const restaurantId = req.query.restaurantId;
     const restaurantList = req.body.restaurantList;

     if (errHan.missingParams([restaurantId, restaurantList], req)) {
         return res.status(404).json();
     }

     menus.findOneAndUpdate({
         'restaurantId': restaurantId
     }, {
         'restaurantList': restaurantList
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.successOnly(`UPDATE: (Super Admin) Link menu (resId:${restaurantId} resList:[${restaurantList}])`, res);
     });
 };

 module.exports.unlink_menu = (req, res, next) => {
     const restaurantId = req.query.restaurantId;

     if (errHan.missingParams([restaurantId], req)) {
         return res.status(404).json();
     }

     menus.findOneAndUpdate({
         'restaurantId': restaurantId
     }, {
         'restaurantList': [restaurantId]
     }, (err, result) => {
         if (err) {
             return errHan.commonError(err, res);
         }
         return returnHan.successOnly(`UPDATE: (Super Admin) Unlink menu (resId:${restaurantId})`, res);
     });
 };