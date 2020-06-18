// ******************************************** DEPENDENCIES ***********************************************************

const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const ensureAuthenticated = require('./middleware').ensureAuthenticated;
const nodemailer = require('nodemailer');
const mongodb = require("mongodb");
const User = require('../models/user');
const Invite = require('../models/invite-a-planner');
const Request = require('../models/request-a-main-user');

// Nexmo
const Nexmo = require('nexmo');
const nexmo = new Nexmo({
    apiKey: '27909b48',
    apiSecret: 'b7f7bc75bcaf6ee9'
});

// ******************************************** GET METHODS ************************************************************

// Register
router.get('/register', (req, res) => {

    let invId = req.query._id;

    return new Promise(() => {
        return Invite.findOne({_id: invId}).exec()
            .then(inv => {
                if (inv === null) {
                    return;
                }
                return User.findOne({_id: inv.user}).exec()
            })
            .then(user => {
                if (invId) {
                    return Invite.findOne({_id: invId}).lean()
                        .then(invite => {

                            if (invite === null) {
                                req.flash('error_msg', 'Main User has canceled an invite! Fill out the form below in order to register as a Main User / Planner.');
                                return res.redirect('/users/register')
                            } else if (invite.status === "Approved") {
                                req.flash('error_msg', 'Invite is no longer valid! Fill out the form below in order to register as a Main User / Planner.');
                                return res.redirect('/users/register')
                            } else {
                                req.session.destroy();
                                return res.render('register_planner', {
                                    id: invId,
                                    user: user.firstname + " " + user.lastname
                                });
                            }
                        });
                }
                return res.render('register', {
                    id: invId
                });
            });
    });
});

// Login
router.get('/login', (req, res) => {
    res.render('login');
});

// Logout
router.get('/logout', ensureAuthenticated, (req, res) => {

    req.logout();
    req.session.destroy(() => {
        res.redirect('/users/login');
    });

});

// Admin - delete users(s)
router.get('/delete-users', (req, res) => {
    User.find({__v: "0"}).lean().exec((err, docs) => {
        if (err) {
            throw err;
        }

        res.render('delete-users', {
            "collection-users": docs
        });
    });
});

//  Invite a planner
router.get('/invite-a-planner', ensureAuthenticated, (req, res) => {
    res.render('invite-a-planner');
});

//  Send request to a main user
router.get('/request-a-main-user', ensureAuthenticated, (req, res) => {
    res.render('request-a-main-user');
});

// Main User - Invites
router.get('/invites', ensureAuthenticated, (req, res) => {

    Invite.find({user: req.user._id, status: "Pending"}).lean().exec((err, docs) => {
        if (err) {
            throw err;
        }

        res.render('invites', {
            "collection-invites": docs
        });
    });
});

// Planner - Requests
router.get('/requests', ensureAuthenticated, (req, res) => {

    Request.find({user: req.user._id, status: "Pending"}).lean().exec((err, docs) => {
        if (err) {
            throw err;
        }

        res.render('requests', {
            "collection-requests": docs
        });
    });
});

// Planner - Invites
router.get('/planner-invites', ensureAuthenticated, (req, res) => {

    // Find invites
    Invite.find({email: req.planner.planner_email, status: "Pending"}).lean().exec((err, docs) => {
        if (err) {
            throw err;
        }

        res.render('planner-invites', {
            "collection-invites": docs
        });
    });
});

// List of requests sent to main user(s)
router.get('/requests-main-user', ensureAuthenticated, (req, res) => {

    // Find all requests in the database
    Request.find({user: req.planner._id, status: "Pending"}).lean().exec((err, docs) => {
        if (err) {
            throw err;
        }

        res.render('requests-main-user', {
            "collection-requests": docs
        });
    });
});

// Main User - Relations
router.get('/relations', ensureAuthenticated, (req, res) => {

    User.findOne({_id: req.user._id}).populate('relations').exec((err, doc) => {
        if (err) {
            throw err;
        }

        res.render('relations', {
            "collection-relations": doc.relations
        });
    });
});

// Planner - Relations
router.get('/planner-relations', ensureAuthenticated, (req, res) => {

    User.findOne({_id: req.planner._id}).populate('relations').exec((err, doc) => {
        if (err) {
            throw err;
        }

        res.render('planner-relations', {
            "collection-relations": doc.relations
        });
    });
});


// **************************************** POST => REGISTER / INVITE **************************************************

// Register User / Planner
router.post('/register', (req, res) => {
    const username = req.body.username;
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const email = req.body.email;
    const bday = req.body.bday;
    const password = req.body.password;
    const userType = req.body.selectrole;
    const phoneNumber = req.body.telnr;

    const inviteId = req.query._id;

    const newUser = new User({
        username,
        firstname,
        lastname,
        email,
        userType,
        password,
        bday
    });

    // Create User / Planner
    User.createUser(newUser)
        .then(user => {
            if (!inviteId) {

                nexmo.verify.request({number: phoneNumber, brand: 'Awesome Company'}, (err, result) => {
                    if(err) {
                        res.sendStatus(500);
                    } else {
                        let requestId = result.request_id;
                        if(result.status === '0') {
                            res.redirect('/users/verify', {requestId: requestId}); // Success! Now, have your user enter the PIN
                        } else {
                            res.status(401).send(result.error_text);
                        }
                    }
                });

                // req.flash('success_msg', 'You have been successfully registered as a ' + userType.toLowerCase() + '! Use the information provided in order to log in.');
                // res.redirect('/users/login');
                // return user;
            }

            const planner = user;

            return Invite.findOne({_id: inviteId}).lean()
                .then(invite => {

                    if (invite.status === "Approved") {
                        req.flash('error_msg', 'Invite is no longer valid!');
                        User.findOne({username: username}).remove().exec();
                        return res.redirect('/users/register')
                    }

                    const mainUserId = invite.user;
                    const plannerId = planner._id;

                    // Update status of the invite from "Pending" to "Approved"
                    return Invite.findOneAndUpdate({_id: inviteId},
                        {$set: {"status": "Approved"}}, {new: true})
                        .then(() => {

                            // Add a relation to planner
                            return User.findOneAndUpdate({username: username},
                                {$addToSet: {"relations": new mongodb.ObjectId(mainUserId)}}, {new: true})
                        })
                        .then(() => {

                            // Add a relation to main user
                            return User.findOneAndUpdate({_id: mainUserId},
                                {$addToSet: {"relations": new mongodb.ObjectId(plannerId)}}, {new: true});
                        })

                        // Send approval to the main user
                        .then(mainUser => {
                            let mainUserEmail = mainUser.email;
                            let mainUserFirstName = mainUser.firstname;
                            let plannerFullName = planner.firstname + " " + planner.lastname;
                            let plannerEmail = planner.planner_email;
                            let linkLogin = "http://localhost:8888/users/login";

                            let transporter = nodemailer.createTransport({
                                host: "192.168.99.100",
                                port: 32769,
                                secure: false,
                                tls: {
                                    rejectUnauthorized: false
                                }
                            });

                            const mailOptions = {
                                from: plannerFullName + " " + plannerEmail,
                                to: mainUserEmail,
                                subject: 'Invite approved ✔',
                                text: 'Hi ' + mainUserFirstName + ',\n\n Your invite was approved by ' + plannerFullName +
                                '. In order to see the changes or manage your relations, please log in:\n\n' + linkLogin +
                                '\n\nBest Regards,\n\nLoginApp'
                            };

                            return transporter.sendMail(mailOptions, (error) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    console.log("An approval sent to: " + mainUserEmail);
                                }
                            });

                        })
                        .then(() => {

                            // Set userType to "Planner"
                            return User.findOneAndUpdate({username: username},
                                {$set: {"userType": "Planner"}}, {new: true});

                        })
                        .then(() => {
                            return User.findOne({_id: mainUserId}).exec()
                        })
                        .then(user => {
                            req.flash('success_msg', 'You have been successfully registered as a planner for ' + user.firstname + ' ' + user.lastname + '! Use the information provided in order to log in.');
                            res.redirect('/users/login');
                        });

                })

        }).catch(err => {

        if (err.name === 'MongoError' && err.code === 11000) {
            // Duplicate username
            req.flash('error_msg', 'Username or e-mail entered already exists!');
            res.redirect('/users/register');
            return;
        }

        console.log('Error: ' + err);
        req.flash('error_msg', 'Unkown error');
        res.redirect('/users/register');
    });

});

// Invite a planner
router.post('/invite-a-planner', (req, res) => {

    const email = req.body.inviteEmail;

    const newInvite = new Invite({
        inviteType: 'planner',
        status: 'Pending',
        mainUser: req.user.firstname + " " + req.user.lastname,
        planner_email: email,
        user: req.user._id
    });

    // Create invite
    Invite.createInvite(newInvite)
        .then(invite => {

            // Send e-mail with nodemailer
            let linkRegister = "http://localhost:8888/users/register/?_id=" + newInvite._id;
            let linkLogin = "http://localhost:8888/users/login";
            let mainUserFullName = req.user.firstname + " " + req.user.lastname;
            let mainUserEmail = req.user.email;

            let transporter = nodemailer.createTransport({
                host: "192.168.99.100",
                port: 32769,
                secure: false,
                tls: {
                    rejectUnauthorized: false
                }
            });

            return Invite.count({planner_email: email, status: "Pending", user: req.user._id})
                .then(inv => {
                    if (inv > 1) {
                        Invite.findOne({_id: newInvite._id}).remove().exec();
                        req.flash('error_msg', 'You already have a pending invite related to the e-mail address you provided. ' +
                            'If you want to re-send invite, please delete the pending invite first.');
                        return res.redirect('/users/invite-a-planner')
                    }

                    return User.findOne({email: email}).lean()
                        .then(user => {

                            if (user === null) {

                                const mailOptions = {
                                    from: mainUserFullName + " " + mainUserEmail,
                                    to: email,
                                    subject: 'Invite ✔',
                                    text: 'Hi,\n\n You have been invited to plan for ' + mainUserFullName + '. If you would like ' +
                                    'to accept the invitation, you must register first. Please click on the link below in order ' +
                                    'to register an account:\n\n' + linkRegister + '\n\nBest Regards,\n\nLoginApp'
                                };

                                return transporter.sendMail(mailOptions, (error) => {
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        console.log("Invite sent to: " + email);
                                    }
                                });

                            } else {
                                const mailOptions = {
                                    from: mainUserFullName + " " + mainUserEmail,
                                    to: email,
                                    subject: 'Invite ✔',
                                    text: 'Hi,\n\n You have been invited to plan for ' + mainUserFullName + '. If you would like ' +
                                    'to accept the invitation please click on the link below and log in into your account:\n\n' + linkLogin
                                    + '\n\nBest Regards,\n\nLoginApp'
                                };


                                return transporter.sendMail(mailOptions, (error) => {
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        console.log("Invite sent to: " + email);
                                    }
                                });
                            }

                        }).then(() => {
                            return invite;
                        })
                        .then(invite => {
                            console.log(invite);
                            req.flash('success_msg', 'An invite was successfully sent to ' + email + '.');
                            res.redirect('/users/invite-a-planner');
                        });
                })
        }).catch(err => {
        console.log('Error: ' + err);
        req.flash('error_msg', 'Unkown error');
        res.redirect('/users/invite-a-planner');
    });

});

// Send request to a main user
router.post('/request-a-main-user', (req, res) => {

    const email = req.body.inviteEmail;

    const newRequest = new Request({
        inviteType: 'main user',
        status: 'Pending',
        planner: req.planner.firstname + " " + req.planner.lastname,
        main_user_email: email,
        user: req.planner._id
    });

    // Create request
    Request.createRequest(newRequest)
        .then(request => {

            // Send e-mail with nodemailer
            let linkRegister = "http://localhost:8888/users/register/?_id=" + newRequest._id;
            let linkLogin = "http://localhost:8888/users/login";
            let plannerFullName = req.planner.firstname + " " + req.planner.lastname;
            let plannerEmail = req.planner.email;

            let transporter = nodemailer.createTransport({
                host: "192.168.99.100",
                port: 32769,
                secure: false,
                tls: {
                    rejectUnauthorized: false
                }
            });

            return Request.count({main_user_email: email, status: "Pending", user: req.planner._id})
                .then(reqMainUser => {
                    if (reqMainUser > 1) {
                        Request.findOne({_id: newRequest._id}).remove().exec();
                        req.flash('error_msg', 'You already have a pending invite related to the e-mail address you provided. ' +
                            'If you want to re-send invite, please delete the pending invite first.');
                        return res.redirect('/users/request-a-main-user')
                    }

                    return User.findOne({email: email}).lean()
                        .then(user => {

                            if (user === null) {

                                const mailOptions = {
                                    from: plannerFullName + " " + plannerEmail,
                                    to: email,
                                    subject: 'Invite ✔',
                                    text: 'Hi,\n\n You have been invited to plan for ' + plannerFullName + '. If you would like ' +
                                    'to accept the invitation, you must register first. Please click on the link below in order ' +
                                    'to register an account:\n\n' + linkRegister + '\n\nBest Regards,\n\nLoginApp'
                                };

                                return transporter.sendMail(mailOptions, (error) => {
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        console.log("Invite sent to: " + email);
                                    }
                                });

                            } else {
                                const mailOptions = {
                                    from: plannerFullName + " " + plannerEmail,
                                    to: email,
                                    subject: 'Invite ✔',
                                    text: 'Hi,\n\n You have been invited to plan for ' + plannerFullName + '. If you would like ' +
                                    'to accept the invitation please click on the link below and log in into your account:\n\n' + linkLogin
                                    + '\n\nBest Regards,\n\nLoginApp'
                                };


                                return transporter.sendMail(mailOptions, (error) => {
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        console.log("Invite sent to: " + email);
                                    }
                                });
                            }

                        }).then(() => {
                            return request;
                        })
                        .then(request => {
                            console.log(request);
                            req.flash('success_msg', 'An invite was successfully sent to ' + email + '.');
                            res.redirect('/users/request-a-main-user');
                        });
                })
        }).catch(err => {
        console.log('Error: ' + err);
        req.flash('error_msg', 'Unkown error');
        res.redirect('/users/request-a-main-user');
    });

});

// ***************************************** PASSPORT AUTHENTICATION ***************************************************

// Local Strategy
passport.use(new LocalStrategy(
    (username, password, done) => {


        User.getUserByUsername(username, (err, user) => {
            if (err) throw err;
            if (!user) {
                return done(null, false, {message: 'Unknown User! Please try again.'});
            }

            if (user.userType === "Main User") {

                router.use(passport.initialize({
                    userProperty: "user"
                }));

                User.comparePassword(password, user.password, (err, isMatch) => {
                    if (err) throw err;
                    if (isMatch) {
                        return done(null, user);
                    } else {
                        return done(null, false, {message: 'Invalid password! Please try again.'});
                    }
                });
            } else if (user.userType === "Planner"){

                router.use(passport.initialize({
                    userProperty: "planner"
                }));

                User.comparePassword(password, user.password, (err, isMatch) => {
                    if (err) throw err;
                    if (isMatch) {
                        return done(null, user);
                    } else {
                        return done(null, false, {message: 'Invalid password! Please try again.'});
                    }
                });
            } else {

                router.use(passport.initialize({
                    userProperty: "admin"
                }));

                User.comparePassword(password, user.password, (err, isMatch) => {
                    if (err) throw err;
                    if (isMatch) {
                        return done(null, user);
                    } else {
                        return done(null, false, {message: 'Invalid password! Please try again.'});
                    }
                });
            }
        });
    }));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.getUserById(id, (err, user) => {
        done(err, user);
    });
});

router.post('/login',
    passport.authenticate('local', {successRedirect: '/', failureRedirect: '/users/login', failureFlash: true}),
    (req, res) => {
        res.redirect('/');
    });


// ************************************ DELETE / APPROVE => INVITES / RELATIONS ****************************************


// Delete an invite - Main User
router.delete('/invites/:mongo_id', (req, res) => {

    const id = req.params.mongo_id;

    Invite.deleteOne({_id: id}, (err) => {
        if (err) {
            throw err;
        } else {
            console.log("Deleted an invite with the following id: " + id);
            res.send('');
        }
    });

});

// Delete a request - Planner
router.delete('/requests-main-user/:mongo_id', (req, res) => {

    const id = req.params.mongo_id;

    Request.deleteOne({_id: id}, (err) => {
        if (err) {
            throw err;
        } else {
            console.log("Deleted a request with the following id: " + id);
            res.send('');
        }
    });

});

// Delete an invite - Planner
router.delete('/planner-invites/:mongo_id', (req, res) => {

    const id = req.params.mongo_id;

    Invite.deleteOne({_id: id}, (err) => {
        if (err) {
            throw err;
        } else {
            console.log("Deleted an invite with the following id: " + id);
            res.send('');
        }
    });

});



// Approve an invite - Planner
router.get('/planner-invites/:mongo_id', (req, res) => {

    const inviteId = req.params.mongo_id;

    return new Promise((resolve, reject) => {

        Invite.findOneAndUpdate({_id: inviteId}, {$set: {"status": "Approved"}}, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log("Approved an invite!");
                resolve(res.send(''));
            }
        });
    })
        .then(() => {

            return Invite.findOne({_id: inviteId}).lean()

        })
        .then(invite => {
            const mainUserId = invite.user;

            // Add a relation to planner
            return User.findOneAndUpdate({_id: req.planner._id},
                {$addToSet: {"relations": new mongodb.ObjectId(mainUserId)}}, {new: true})

                .then(() => {

                    // Add a relation to main user
                    return User.findOneAndUpdate({_id: mainUserId},
                        {$addToSet: {"relations": new mongodb.ObjectId(req.planner._id)}}, {new: true});
                })

                .then(() => {
                    return User.findOne({_id: mainUserId}).lean()
                })

                .then(user => {
                    let mainUserEmail = user.email;
                    let mainUserFirstName = user.firstname;
                    let plannerFullName = req.planner.firstname + " " + req.planner.lastname;
                    let plannerEmail = req.planner.planner_email;
                    let linkLogin = "http://localhost:8888/users/login";

                    let transporter = nodemailer.createTransport({
                        host: "192.168.99.100",
                        port: 32769,
                        secure: false,
                        tls: {
                            rejectUnauthorized: false
                        }
                    });

                    const mailOptions = {
                        from: plannerFullName + " " + plannerEmail,
                        to: mainUserEmail,
                        subject: 'Invite approved ✔',
                        text: 'Hi ' + mainUserFirstName + ',\n\n Your invite was approved by ' + plannerFullName +
                        '. In order to see the changes or manage your relations, please log in:\n\n' + linkLogin +
                        '\n\nBest Regards,\n\nLoginApp'
                    };

                    return transporter.sendMail(mailOptions, (error) => {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log("An approval sent to: " + mainUserEmail);
                        }
                    });

                });

        });

});

// Delete a relation - Main User
router.delete('/relations/:mongo_id', (req, res) => {

    const plannerId = req.params.mongo_id;
    const mainUserId = req.user._id;

    User.findOneAndUpdate({_id: mainUserId}, {$pull: {"relations": plannerId}}, (err) => {
        if (err) {
            throw err;
        } else {
            console.log("Deleted a relation with the following id: " + plannerId);
        }
    });

    User.findOneAndUpdate({_id: plannerId}, {$pull: {"relations": mainUserId}}, (err) => {
        if (err) {
            throw err;
        } else {
            console.log("Deleted a relation with the following id: " + mainUserId);
            res.send('');
        }
    });

});

// Delete a relation - Planner
router.delete('/planner-relations/:mongo_id', (req, res) => {

    const mainUserId = req.params.mongo_id;
    console.log(mainUserId);
    const plannerId = req.planner._id;

    User.findOneAndUpdate({_id: plannerId}, {$pull: {"relations": mainUserId}}, (err) => {
        if (err) {
            throw err;
        } else {
            console.log("Deleted a relation with the following id: " + mainUserId);
        }
    });

    User.findOneAndUpdate({_id: mainUserId}, {$pull: {"relations": plannerId}}, (err) => {
        if (err) {
            throw err;
        } else {
            console.log("Deleted a relation with the following id: " + plannerId);
            res.send('');
        }
    });
});

// Delete User(s) - Admin
router.delete('/delete-users/:mongo_id', (req, res) => {

    const id = req.params.mongo_id;

    User.deleteOne({_id: id}, (err) => {
        if (err) {
            throw err;
        } else {
            console.log("Deleted a user with the following id: " + id);
            res.send('');
        }
    });

});

// Verify user
router.post('/verify', (req, res) => {
    let pin = req.body.pin;
    let requestId = req.body.requestId;

    nexmo.verify.check({request_id: requestId, code: pin}, (err, result) => {
        if(err) {
            // handle the error
        } else {
            if(result && result.status === '0') { // Success!
                res.status(200).send('Account verified!');
                res.render('status', {message: 'Account verified! 🎉'});
            } else {
                // handle the error - e.g. wrong PIN
            }
        }
    });
});


module.exports = router;