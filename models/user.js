const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = mongoose.Schema({
    username: {
        type: String,
        index: true,
        unique: true
    },
    password: {
        type: String
    },
    email: {
        type: String,
        unique: true
    },
    firstname: {
        type: String
    },
    lastname: {
        type: String
    },
    userType: {
        type: String
    },
    bday: {
        type: Date,
        default: Date.now
    },
    relations: {
        type:  [mongoose.Schema.ObjectId]
    }
});

const User = module.exports = mongoose.model('User', userSchema);

// Create user
module.exports.createUser = (newUser, callbackFunction) => {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
                if (err) {
                    return reject(err);
                }
                newUser.password = hash;
                return resolve(newUser.save(callbackFunction));
            });
        });
    });
};

// Get user by username
module.exports.getUserByUsername = (username, callback) => {
    var query = {username: username};
    User.findOne(query, callback);
};

// Get user by id
module.exports.getUserById = (id, callback) => {
    User.findById(id, callback);
};

// Compare passwords
module.exports.comparePassword = (candidatePassword, hash, callback) => {
    bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
        if (err) throw err;
        callback(null, isMatch);
    });
};