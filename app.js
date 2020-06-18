// Dependencies
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const index = require('./routes/index');
const users = require('./routes/users');

// Connect to loginapp database
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/loginapp', {
    useMongoClient: true
});

// Init App
const app = express();

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'lizard king',
    saveUninitialized: true,
    resave: true,
    cookie: {maxAge: 30 * 24 * 60 * 60 * 1000}
}));

// Passport init
app.use(passport.initialize({}));
app.use(passport.session());

// Express Validator
app.use(expressValidator({
    errorFormatter(param, msg, value) {
        const namespace = param.split('.');
        const root = namespace.shift();
        let formParam = root;

        while(namespace.length) {
            formParam += `[${namespace.shift()}]`;
        }
        return {
            param : formParam,
            msg,
            value
        };
    }
}));

// Caching disabled for every route
app.use(function(req, res, next) {
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});

// Connect Flash
app.use(flash());

// Global Vars
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    res.locals.planner = req.planner || null;
    res.locals.admin = req.admin || null;
    next();
});

// Connect all our routes to our application
app.use('/', index);
app.use('/users', users);

// Set Port
app.set('port', (process.env.PORT || 8888));

app.listen(app.get('port'), () => {
    console.log(`Server started on port ${app.get('port')}`);
});