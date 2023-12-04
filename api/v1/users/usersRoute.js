const express = require('express');

const router = express.Router();
const usersController = require('./usersController');
const notificationsController = require('../notifications/notificationsController');
const bruteforce = require('../utils/brute-force');
const passport = require('../utils/passport');

router.post('/sign-up', [passport.authenticate('jwt'), bruteforce.prevent], usersController.sign_up);

router.post('/login', [passport.authenticate('jwt'), bruteforce.prevent], usersController.login);

router.post('/check-username', passport.authenticate('jwt'), usersController.check_username);

router.post('/check-contact', passport.authenticate('jwt'), usersController.check_contact);

router.put('/update-password', passport.authenticate('jwt'), usersController.update_password);

router.get('/notifications', passport.authenticate('jwt'), notificationsController.get_notifications);

router.get('/notifications/count', passport.authenticate('jwt'), notificationsController.get_notifications_count);

router.put('/notifications', passport.authenticate('jwt'), notificationsController.read_notifications);

router.get('/notifications/reservation', passport.authenticate('jwt'), notificationsController.get_reservation_request);

router.put('/favourites', passport.authenticate('jwt'), usersController.get_favourites);

router.put('/favourites/add', passport.authenticate('jwt'), usersController.add_favourites);

router.put('/favourites/remove', passport.authenticate('jwt'), usersController.remove_favourites);

router.put('/image', passport.authenticate('jwt'), usersController.update_user_image);

router.put('/email/', passport.authenticate('jwt'), usersController.update_user_email);

module.exports = router;