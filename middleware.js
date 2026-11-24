module.exports.isLoggedIn = (req, res, next) => {
if (!req.isAuthenticated()) {
    req.session.redirectTo = req.originalUrl;
        req.flash("error", "You must be logged in to perform that action.");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectTo) {
        res.locals.redirectUrl = req.session.redirectTo;
    }
    next();
};
