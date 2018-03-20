import 'zone.js/dist/zone-node';
import 'reflect-metadata';
import 'rxjs/Rx';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as compression from 'compression';
import * as awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';

import { ServerAppModule } from './app/server-app.module';
import { ngExpressEngine, REQUEST } from '@nguniversal/express-engine';
import { enableProdMode } from '@angular/core';
import { USERAGENTTOKEN } from './app/windowRef';

enableProdMode();
export const app = express();

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(awsServerlessExpressMiddleware.eventContext());

app.engine('html', ngExpressEngine({
  bootstrap: ServerAppModule,
    providers: [
        {provide: USERAGENTTOKEN, useValue: REQUEST }
    ]
}));

app.set('view engine', 'html');
app.set('views', 'dist');

app.use('/', express.static('dist', { index: false }));

// redirection from safari notification to given external page
app.get('/redirect/**', (req, res) => {
    const location = req.url.substring(10);
    res.redirect(301, location);
});

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

app.post('/testPost', (req, res) => {
  res.status(200).send({receivedValue: req.body.exampleKey});
});
