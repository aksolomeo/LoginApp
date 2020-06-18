const mongoose = require('mongoose');

// Invite Schema
const inviteSchema = mongoose.Schema({
    inviteType: {
        type: String
    },
    status: {
        type: String
    },
    planner_email: {
        type: String
    },
    mainUser: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId
    }
});

const Invite = module.exports = mongoose.model('Invite', inviteSchema);

// Create invite
module.exports.createInvite = (newInvite, callbackFunction) => {
    return new Promise((resolve, reject, err) => {
        if (err) {
            return reject(err);
        }
        return resolve(newInvite.save(callbackFunction));
    });

};
