const express = require('express');

const router = express.Router();
const ticketsController = require('./ticketsController');
const passport = require('../utils/passport');

// Admin access area
router.get('/restaurants', passport.authenticate('jwt'), ticketsController.get_ticket_details_admin);

router.put('/vouchers', passport.authenticate('jwt'), ticketsController.claim_ticket_voucher);

router.put('/reservations', passport.authenticate('jwt'), ticketsController.claim_ticket_reservation);

router.post('/claim', passport.authenticate('jwt'), ticketsController.send_fcm_claim_confirmation); // Todo remove

router.get('/check_monthly', passport.authenticate('jwt'), ticketsController.check_monthly_limit);

router.get('/check_ticket', passport.authenticate('jwt'), ticketsController.check_ticket_availability);


// User access area
router.post('/vouchers', passport.authenticate('jwt'), ticketsController.create_ticket_voucher);

router.get('/users', passport.authenticate('jwt'), ticketsController.get_tickets_list);

router.get('/users/unread', passport.authenticate('jwt'), ticketsController.get_unread_tickets_count);

router.get('/users/read', passport.authenticate('jwt'), ticketsController.read_tickets);

router.get('/', passport.authenticate('jwt'), ticketsController.get_ticket_details);

router.get('/quantity', passport.authenticate('jwt'), ticketsController.get_ticket_details_quantity);

module.exports = router;