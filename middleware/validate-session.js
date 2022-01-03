const jwt = require("jsonwebtoken");
const User = require("../db").User;

module.exports = (req, res, next) => {
    if (req.method == "OPTIONS") return next();

    const token = req.headers.authorization;
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
        // FAIL - Bad token
        if (err) {
            req.errors = err;
            return next();
        }
        // console.log("decoded token",decodedToken)
        let user = await User.findOne({ where: { uuid: decodedToken.uuid } })
        // FAIL - No user found
        if (!user) throw 'err';
        // PASS - User is set
        req.user = user;
        next();
    })
}