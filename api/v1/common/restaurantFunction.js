const restaurants = require('../restaurants/restaurantsModel');
const winston = require('../utils/winston');
const errHan = require('../common/errorHandle');

module.exports.changeRestaurantStatus = (restaurantId, status, res) => {
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
        winston.info(`UPDATE: Restaurant status to ${status} (resId:${restaurantId})`);
    });
};