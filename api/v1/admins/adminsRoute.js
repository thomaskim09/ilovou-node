const express = require('express');

const router = express.Router();
// Controllers
const adminsController = require('./adminsController');
const notificationsController = require('../notifications/notificationsController');
const ticketsController = require('../tickets/ticketsController');
const tempNotificationsController = require('../temps/temp_notificationsController');
// const bruteforce = require('../utils/brute-force');
const passport = require('../utils/passport');

router.post('/login', passport.authenticate('jwt'), adminsController.login);

router.post('/logout', passport.authenticate('jwt'), adminsController.logout);

router.get('/temp_notifications', passport.authenticate('jwt'), tempNotificationsController.get_temp_notifications);

router.get('/temp_notifications/count', passport.authenticate('jwt'), tempNotificationsController.get_temp_notifications_count);

router.put('/temp_notifications', passport.authenticate('jwt'), tempNotificationsController.read_temp_notifications);

router.get('/notifications', passport.authenticate('jwt'), notificationsController.get_notifications);

router.get('/reservation_notifications', passport.authenticate('jwt'), notificationsController.get_reservation_notifications);

router.get('/reservation_notifications/details', passport.authenticate('jwt'), notificationsController.get_reservation_notifications_details);

router.get('/notifications/count', passport.authenticate('jwt'), notificationsController.get_notifications_count);

router.put('/notifications', passport.authenticate('jwt'), notificationsController.read_notifications);

router.get('/ticket_notifications', passport.authenticate('jwt'), notificationsController.get_ticket_notifications);

router.get('/ticket_notifications/details', passport.authenticate('jwt'), notificationsController.get_ticket_notifications_details);

router.get('/ticket_notifications/count', passport.authenticate('jwt'), notificationsController.get_ticket_notifications_count);

router.put('/ticket_notifications/read', passport.authenticate('jwt'), notificationsController.read_ticket_notifications);

router.get('/company_info', passport.authenticate('jwt'), adminsController.get_company_details);

router.get('/summary_ticket', passport.authenticate('jwt'), ticketsController.get_summary_ticket);

router.get('/status', passport.authenticate('jwt'), adminsController.check_admin_status);

router.get('/feature', passport.authenticate('jwt'), adminsController.check_admin_feature);

router.get('/branch', passport.authenticate('jwt'), adminsController.get_restaurant_list);

router.put('/branch_vouchers', passport.authenticate('jwt'), adminsController.check_branch_vouchers);

module.exports = router;