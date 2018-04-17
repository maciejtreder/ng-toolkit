import 'zone.js/dist/zone-node';
import 'reflect-metadata';
import {enableProdMode} from '@angular/core';
import {ngExpressEngine} from '@nguniversal/express-engine';
import {provideModuleMap} from '@nguniversal/module-map-ngfactory-loader';

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as compression from 'compression';

import {join} from 'path';

enableProdMode();

export const app = express();

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const DIST_FOLDER = join(process.cwd(), 'dist');

const {AppServerModuleNgFactory, LAZY_MODULE_MAP} = require('./dist/server/main');

app.engine('html', ngExpressEngine({
  bootstrap: AppServerModuleNgFactory,
  providers: [
    provideModuleMap(LAZY_MODULE_MAP)
  ]
}));

app.set('view engine', 'html');
app.set('views', join(DIST_FOLDER, 'browser'));

app.get('/redirect/**', (req, res) => {
  const location = req.url.substring(10);
  res.redirect(301, location);
});

app.get('*.*', express.static(join(DIST_FOLDER, 'browser'), {
  maxAge: '1y'
}));

app.get('/*', (req, res) => {
  if (req.headers.host.indexOf('angular-universal-pwa.maciejtreder.com') > -1 && req.headers.host !== 'www.angular-universal-pwa.maciejtreder.com') {
    res.writeHead (301, {Location: 'https://www.angular-universal-pwa.maciejtreder.com'});
    res.end();
    return;
  }
  res.render('index', {req, res}, (err, html) => {
    if (html) {
      if (req.headers.host.indexOf('amazonaws.com') > 0) {
        html = html.replace('<base href="/', '<base href="/production/');
      }
      res.send(html);
    } else {
      res.send(err);
    }
  });
});
