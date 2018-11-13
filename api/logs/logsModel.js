const mongoose = require("mongoose");

const logsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  host: String,
  logname: String,
  user: String,
  time: Date,
  path: String,
  request: String,
  status: Number,
  response_size: Number,
  referrer: String,
  user_agent: String
});

module.exports = mongoose.model("Logs", logsSchema);
