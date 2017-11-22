# Angular 5 Universal Progressive Web App - starter
![angular-universal-PWA report](https://raw.github.com/maciejtreder/angular-universal-pwa/master/src/assets/img/lighthouse_report.png)
### _**Star it and share with others!**_
This repo is the boilerplate for Angular Universal (serverside rendering) applications.
It is running as a **(PWA) progressive web app** with the whole goodness of it (push messages, content caching and making it installable on the Android devices)!
It is prepared to be easily deployed on serverless environment (like AWS Lambda).

This is a great starting point for **microservices application**! Because of support for external modules, you can split your application into separate projects and combine them together when deploying!

## Live demo
[Angular Universal PWA on AWS Lambda + API Gateway](https://www.angular-universal-pwa.maciejtreder.com)


## What's inside?
* PWA - content is cached and available offline, it can be also installed as native app on Android devices and Google Chrome
* Push notifications:
    * Vapid webpush (Chrome and Firefox) - Using [aws-sns-webpush](https://github.com/maciejtreder/aws-sns-webpush) as back-end
    * Safari push - Using [aws-sns-webpush](https://github.com/maciejtreder/aws-sns-webpush) as back-end
* Lazy loading modules
* External modules (You can split your application into multiple projects and lazy-load them, [read more here](https://github.com/maciejtreder/angular-external-module))
* Angular Material
* Unit tests


### Used frameworks/technologies
* Webpack
* UglifyJS
* OptimizeJS
* DllPlugin (super fast reloading in development mode)
* Sass loader
* Serverless framework


## Get Started
```sh
git clone https://github.com/maciejtreder/angular-universal-pwa.git
cd angular-universal-serverless
npm install
npm start
```
* Development mode (autoreload only): ```npm start```
* Development mode (autoreload + unit tests): ```npm run build:dev```
* Unit tests: ```npm run test```


## Production mode
Includes AoT
```sh
npm run build:prod
npm run server
```

## Deploy on AWS Lambda
```sh
npm run build:deploy
```
## To do
* AMP support (research + implementation)
* [ng-http-sw-proxy (all requests done offline, are synced when app comes back online)](https://github.com/maciejtreder/ng-http-sw-proxy) - not working since Angular 5.x (more info can be found in [this issue](https://github.com/webmaxru/pwatter/issues/2))
* e2e tests
* microservices support - make replacement eligible external module without recompiling whole app
* Google Cloud support

## Won't implement:
* load static content from S3 (JavaScript, styles, images):
    * when serving all static content from S3 load speed up is not really visible (increase is around ~0,2 sec),
    * problems with CORS and Chrome,
    * problems with compression of some files (.js files are not compressed in some cases)
    * needs a lot of manual setup (cloudfront setup etc.)

## Credentials
* Checkout my [home page](https://www.maciejtreder.com) and find out more about me
* Built on top of [ng-universal-demo](https://github.com/FrozenPandaz/ng-universal-demo)
