const mongoose = require('mongoose');

const versionSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    details: {
        appName: String,
        currentVersion: String,
        history: {
            type: Array,
            default: undefined
        }
    }
});

module.exports = mongoose.model('version', versionSchema);