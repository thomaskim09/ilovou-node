const express = require('express');

const router = express.Router();

const reservationsController = require('../reservations/reservationsController');
const notificationsController = require('../notifications/notificationsController');
const passport = require('../utils/passport');

// Admin access area
router.get('/restaurants', passport.authenticate('jwt'), reservationsController.get_reservation_settings);

router.put('/restaurants', passport.authenticate('jwt'), reservationsController.update_reservation_settings);

router.get('/notice', passport.authenticate('jwt'), reservationsController.get_reservation_notice);

router.put('/notice', passport.authenticate('jwt'), reservationsController.update_reservation_notice);

// User access area
router.get('/restaurants/users', passport.authenticate('jwt'), reservationsController.get_reservation_settings_user);

router.post('/users', passport.authenticate('jwt'), notificationsController.create_reservation_notification);

router.put('/', passport.authenticate('jwt'), reservationsController.change_reservation_status);

router.get('/check', passport.authenticate('jwt'), reservationsController.check_reservation_status);

router.get('/status', passport.authenticate('jwt'), reservationsController.get_reservation_status);

router.get('/details', passport.authenticate('jwt'), reservationsController.get_reservation_details);

module.exports = router;