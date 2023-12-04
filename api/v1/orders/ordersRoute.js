const express = require('express');

const router = express.Router();
const ordersController = require('./ordersController');
const tempOrdersController = require('../temps/temp_ordersController');
const tempNotificationsController = require('../temps/temp_notificationsController');
const passport = require('../utils/passport');

// Admin access area
router.get('/temp/restaurants', passport.authenticate('jwt'), tempOrdersController.get_all_temp_order_list_header);

router.put('/temp/status', passport.authenticate('jwt'), tempOrdersController.change_temp_order_status);

router.put('/temp', passport.authenticate('jwt'), tempOrdersController.send_order_approval);

router.get('/temp', passport.authenticate('jwt'), tempOrdersController.get_temp_order_details);

router.get('/temp/check', passport.authenticate('jwt'), tempOrdersController.check_temp_order_status);

router.get('/temp/admins/count', passport.authenticate('jwt'), tempOrdersController.get_temp_order_count);

router.get('/temp/admins/read', passport.authenticate('jwt'), tempOrdersController.read_temp_order);

router.get('/history/months', passport.authenticate('jwt'), ordersController.get_history_months);

router.get('/history/days', passport.authenticate('jwt'), ordersController.get_history_days);

router.get('/history/days-orders', passport.authenticate('jwt'), ordersController.get_history_days_orders);

router.get('/', passport.authenticate('jwt'), ordersController.get_order_details);

router.post('/notify', passport.authenticate('jwt'), ordersController.notify_user);


// User access area
router.get('/temp/status', tempOrdersController.get_temp_order_status);

router.get('/temp/check_table', tempOrdersController.check_table_status);

router.post('/temp', tempOrdersController.create_temp_order);

router.post('/call', tempNotificationsController.need_service);

router.get('/temp/history/days-orders', passport.authenticate('jwt'), tempOrdersController.get_history_days_temp_orders);

router.get('/temp/history/details', passport.authenticate('jwt'), tempOrdersController.get_history_days_temp_orders_details);


module.exports = router;