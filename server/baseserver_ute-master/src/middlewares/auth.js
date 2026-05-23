const fs = require('fs');
const jwt = require('jsonwebtoken');
const { config } = require('gis-core');

// Todo: имя авторизационной куки и ключ вынести в конфиг
const tokenName = 'gis_gots_web53_cookie_token';
const PUB_KEY = fs.readFileSync(config.Key_Token_Path, 'utf-8');

module.exports = function auth(req, res, next) {
    const token = req.cookies[tokenName];
    if (!token) {
        return res.sendStatus(401);
    }
    try {
        jwt.verify(token, PUB_KEY);
        return next();
    } catch (err) {
        return res.sendStatus(401);
    }
};
