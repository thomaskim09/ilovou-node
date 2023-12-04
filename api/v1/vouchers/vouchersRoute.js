const express = require('express');

const router = express.Router();

const VouchersController = require('../vouchers/vouchersController');
const passport = require('../utils/passport');

// Admin access area
router.get('/', passport.authenticate('jwt'), VouchersController.get_voucher_details);

router.get('/restaurants', passport.authenticate('jwt'), VouchersController.get_voucher_list);

router.post('/', passport.authenticate('jwt'), VouchersController.create_voucher);

router.put('/', passport.authenticate('jwt'), VouchersController.change_voucher_status);

router.put('/order', passport.authenticate('jwt'), VouchersController.update_voucher_order);


// User access area
router.get('/restaurants/users', passport.authenticate('jwt'), VouchersController.get_voucher_list_user);

router.get('/users', passport.authenticate('jwt'), VouchersController.get_voucher_details_user);

router.post('/users', passport.authenticate('jwt'), VouchersController.check_voucher_availability);

router.get('/free', passport.authenticate('jwt'), VouchersController.check_voucher_free);

router.post('/quantity', passport.authenticate('jwt'), VouchersController.update_quantity_sold_only);

module.exports = router;