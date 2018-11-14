const mongoose = require("mongoose");

const reservationSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  restaurant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true
  },
  voucher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Voucher",
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reservationDate: Date,
  reservationTime: Date,
  dinningPax: Number,
  dinningArea: String,
  remark: String, // (optional)
  isReservationAccepted: Boolean,
  modified_date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Reservation", reservationSchema);
