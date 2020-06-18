const mongoose = require('mongoose');

// Invite Schema
const requestSchema = mongoose.Schema({
    inviteType: {
        type: String
    },
    status: {
        type: String
    },
    main_user_email: {
        type: String
    },
    planner: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId
    }
});

const Request = module.exports = mongoose.model('Request', requestSchema);

// Create request
module.exports.createRequest = (newRequest, callbackFunction) => {
    return new Promise((resolve, reject, err) => {
        if (err) {
            return reject(err);
        }
        return resolve(newRequest.save(callbackFunction));
    });
};
