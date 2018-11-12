const mongoose = require("mongoose");

const tagsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: { type: String }
});

module.exports = mongoose.model("Tags", tagsSchema);
