const express = require('express');

const router = express.Router();

const feedbackController = require('./feedbackController');
const passport = require('../utils/passport');

// Admin access
router.get('/count', passport.authenticate('jwt'), feedbackController.get_feedback_count);

router.get('/read', passport.authenticate('jwt'), feedbackController.read_feedback);

router.get('/restaurants', passport.authenticate('jwt'), feedbackController.get_feedback_list);

router.get('/', passport.authenticate('jwt'), feedbackController.get_feedback_details);

router.put('/reply', passport.authenticate('jwt'), feedbackController.reply_feedback);

router.get('/rating', passport.authenticate('jwt'), feedbackController.calculate_rating);


// User access
router.post('/', passport.authenticate('jwt'), feedbackController.create_feedback);

router.get('/users', passport.authenticate('jwt'), feedbackController.get_feedbacks);

router.put('/cancel', passport.authenticate('jwt'), feedbackController.cancel_feedback);

router.get('/check', passport.authenticate('jwt'), feedbackController.check_feedback);

module.exports = router;