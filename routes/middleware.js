
module.exports.ensureAuthenticated = function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        //if user is logged in, req.isAuthenticated() will return true
        return next();
    } else {
        // req.flash('error_msg', 'You are not logged in!')
        res.redirect('/users/login');
    }
};

