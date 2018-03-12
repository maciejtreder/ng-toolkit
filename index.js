'use strict';
const server = require('./dist/server');
const functions = require('firebase-functions');
const express = require('express');

const app = express();

app.get('*',(req,res) => {
	console.log('got request');
	res.send(200).body('test');
});

// exports.http = functions.https.onRequest(express);
// exports.http = server;
exports.http = functions.https.onRequest(server);