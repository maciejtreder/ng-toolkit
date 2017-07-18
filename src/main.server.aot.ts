import 'zone.js/dist/zone-node';
import 'reflect-metadata';
import 'rxjs/Rx';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as compression from 'compression';
import * as awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';

import { platformServer, renderModuleFactory } from '@angular/platform-server';
import { ServerAppModuleNgFactory } from './ngfactory/app/server-app.module.ngfactory';
import { ngExpressEngine } from '@nguniversal/express-engine';
import { ROUTES } from './routes';
import { enableProdMode } from '@angular/core';


enableProdMode();
const app = express();

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(awsServerlessExpressMiddleware.eventContext());


app.engine('html', ngExpressEngine({
  bootstrap: ServerAppModuleNgFactory
}));



app.set('view engine', 'html');
app.set('views', 'src');

app.use('/', express.static('dist', { index: false }));

ROUTES.forEach(route => {
  app.get(route, (req, res) => {
    res.render('../dist/index', {
      req: req,
      res: res
    });
  });
});

app.post('/testPost', (req, res) => {
  res.status(200).send({receivedValue: req.body.exampleKey});
});


export = app;
