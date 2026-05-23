const port = process.env.PORT || 3002;
require('dotenv').config();

const express = require('express');
const compression = require('compression');
const fs = require("fs");

const app = express();
const { logger, handleError } = require('gis-core');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const {
    utePrepare,
    uteValidation,
    uteBlockingValidation,
} = require('./middlewares');

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    next();
});

app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Register middleware for ute requests
app.use('/api/ute/*', uteBlockingValidation);
app.use('/api/ute/*', utePrepare);
app.use('/api/ute/*', uteValidation);

// Register routes for app
const auth = require('./middlewares/auth');
const index = require('./routes/index');

app.use('/', auth, index);

// Register error handler
app.use((err, req, res, next) => {
    handleError(err, req, res);
});

const blockerFiles = fs.readdirSync('/home/websys53/gis_web80/nodejs/baseserver/').filter(f => f.startsWith('blockerFile_'));
if (blockerFiles.length > 0) {
    try {
        blockerFiles.forEach((file) => fs.unlinkSync(`/home/websys53/gis_web80/nodejs/baseserver/${file}`));
    } catch (e) {}
}


logger.info(`Server 'baseserver_ute' listening on port ${port}`);

module.exports = app;
