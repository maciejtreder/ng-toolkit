import 'zone.js/dist/zone-node';
import 'reflect-metadata';
import 'rxjs/Rx';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as compression from 'compression';

import { ServerAppModule } from './app/server-app.module';
import { ngExpressEngine, REQUEST } from '@nguniversal/express-engine';
import { enableProdMode } from '@angular/core';
import { USERAGENTTOKEN } from './app/windowRef';

import * as firebaseFunctions from 'firebase-functions';

const app = express();
enableProdMode();

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.engine('html', ngExpressEngine({
  bootstrap: ServerAppModule,
    providers: [
        {provide: USERAGENTTOKEN, useValue: REQUEST }
    ]
}));

app.set('view engine', 'html');
app.set('views', 'dist');

app.use('/', express.static('dist', { index: false }));

app.get('/**', (req, res) => {
    res.render('index', {req, res});
});

// redirection from safari notification to given external page
app.get('/redirect/**', (req, res) => {
  const location = req.url.substring(10);
  res.redirect(301, location);
});

app.post('/testPost', (req, res) => {
  res.status(200).send({receivedValue: req.body.exampleKey});
});

export const http = firebaseFunctions.https.onRequest(app);
