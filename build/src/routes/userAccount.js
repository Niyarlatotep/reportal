"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const userAccount_1 = require("../models/userAccount");
const express = require("express");
const userAccountRouter = express.Router();
exports.userAccountRouter = userAccountRouter;
userAccountRouter.post('/userAccount', async (req, res) => {
    if (!req.body) {
        return res.status(400).send('Request body is missing');
    }
    const model = new userAccount_1.UserAccountModel(req.body);
    try {
        const doc = await model.save();
        res.status(201).send(doc);
    }
    catch (err) {
        res.status(500).json(err);
    }
});
userAccountRouter.put('/userAccount', async (req, res) => {
    if (!req.query.email) {
        return res.status(400).send('Missing URL parameter: email');
    }
    try {
        const doc = await userAccount_1.UserAccountModel.findOneAndUpdate({
            name: req.query.name
        }, req.body, {
            new: true
        });
        res.send(200);
    }
    catch (e) {
        res.status(500).json;
    }
});
userAccountRouter.delete('/userAccount', async (req, res) => {
    if (!req.query.name) {
        return res.status(400).send('Missing URL parameter: email');
    }
    try {
        const doc = await userAccount_1.UserAccountModel.findOneAndRemove({
            name: req.query.name
        }).exec();
        res.json(doc);
    }
    catch (e) {
        res.status(500).json;
    }
});
