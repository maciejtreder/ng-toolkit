# Progressive Web App written in Angular Universal technology for serverless environment (Angular Material included)
This repo is boilerplate of Angular Universal (serverside rendering) applications.
It is running as a **progressive web app** and includes Angular Material!
It is also built with serverless environment in mind and can be easily deployed on AWS Lambda.

## Live demo
[Angular Universal PWA on AWS Lambda + API Gateway](https://www.angular-universal-pwa.maciejtreder.com)

## What's inside?
* Service-Worker (for content-caching - application works offline - PWA)
* Push notifications:
    * Vapid webpush (Chrome & Firefox) - Using [aws-sns-webpush](https://github.com/maciejtreder/aws-sns-webpush) as back-end
    * Safari push - Using [aws-sns-webpush](https://github.com/maciejtreder/aws-sns-webpush) as back-end
* Mobile devices support
* Angular Material
* [ng-http-sw-proxy (all requests done offline, are synced when app comes back online)](https://github.com/maciejtreder/ng-http-sw-proxy)
* Webpack
* Unit tests
* e2e tests - in progress
* UglifyJS
* OptimizeJS
* Sass loader


## Get Started
```sh
git clone https://github.com/maciejtreder/angular-universal-serverless.git
cd angular-universal-serverless
npm install
npm start
```
* Development mode (autoreload): ```npm run watch```
* Unit tests: ```npm run test:dev```
* Unit tests + development mode: ```npm run test:dev:host```


## Production mode
Includes AoT
```sh
cp -r node_modules/ng-http-sw-proxy/service-worker .
npm run build:prod
npm run server
```

## Deploy on AWS Lambda
```sh
cp -r node_modules/ng-http-sw-proxy/service-worker .
npm run build:deploy
```

Built on top of [ng-universal-demo](https://github.com/FrozenPandaz/ng-universal-demo)
