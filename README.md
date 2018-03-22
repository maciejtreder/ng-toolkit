[![Maintainability](https://api.codeclimate.com/v1/badges/feb1889ed8bd09672fae/maintainability)](https://codeclimate.com/github/maciejtreder/angular-universal-pwa/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/feb1889ed8bd09672fae/test_coverage)](https://codeclimate.com/github/maciejtreder/angular-universal-pwa/test_coverage) 
[![Build Status](https://travis-ci.org/maciejtreder/angular-universal-pwa.png)](https://travis-ci.org/maciejtreder/angular-universal-pwa)
[![Dependency Status](https://david-dm.org/maciejtreder/angular-universal-pwa.svg)](https://david-dm.org/maciejtreder/angular-universal-pwa)


# Angular 5 Universal Progressive Web App - starter [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&logo=twitter)](https://twitter.com/intent/tweet?text=Check%20out%20Angular%20Universal%20PWA%20boilerplate&url=https://github.com/maciejtreder/angular-universal-pwa&via=maciejtreder&hashtags=angular,pwa,webapp,software,developers)
![angular-universal-PWA report](https://raw.github.com/maciejtreder/angular-universal-pwa/master/src/assets/img/lighthouse_report.png)

### _**Star it and share with others!**_
This repo is the boilerplate for Angular Universal (serverside rendering) applications.
It is running as a **(PWA) progressive web app** with the whole goodness of it (push messages, content caching and making it installable on the Android devices)!
It is prepared to be easily deployed on serverless environment (Google Cloud Functions & AWS Lambda supported).

This is a great starting point for **microservices application**! Because of support for external modules, you can split your application into separate projects and combine them together when deploying!


 - [What's inside?](#wi)
 - [Question, Problem or Feature Request?](#question)
 - [Used Technologies](#tech)
 - [Getting started](#start)
 - [To do](#todo)
 - [Funding](#funding)
 - [Credentials](#credentials)

## Live demo
[Angular Universal PWA on AWS Lambda + API Gateway](https://www.angular-universal-pwa.maciejtreder.com)


## <a name="wi"></a> What's inside?
* PWA - content is cached and available offline, it can be also installed as native app on Android devices and Google Chrome
* AMP - Accelerated Mobile Pages - super fast initial load (down to ~650ms)
* Push notifications:
    * Vapid webpush (Chrome and Firefox) - Using [aws-sns-webpush](https://github.com/maciejtreder/aws-sns-webpush) as back-end
    * Safari push - Using [aws-sns-webpush](https://github.com/maciejtreder/aws-sns-webpush) as back-end
* Server-side rendering with Angular Universal
* TransferState
* Lazy loading modules
* External modules (You can split your application into multiple projects and lazy-load them, [read more here](https://github.com/maciejtreder/angular-external-module))
* Angular Material
* Unit tests
* Firebug Lite (great solution for development on touch-screen devices, ie: iPad)

## <a name="question"></a> Looking for something more?
Feel free to [create issue with your feature request](https://github.com/maciejtreder/angular-universal-pwa/issues/new)

### <a name="tech"></a> Used frameworks/technologies
* Angular 5.x
* Webpack
* UglifyJS
* OptimizeJS
* DllPlugin (super fast reloading in development mode)
* Sass loader
* Serverless framework


## <a name="start"></a> Get Started
```sh
git clone https://github.com/maciejtreder/angular-universal-pwa.git
cd angular-universal-serverless
npm install
npm start
```
* Development mode (autoreload only): ```npm start```
* Development mode (autoreload + unit tests): ```npm run build:dev```
* Development mode (autoreload + firebug lite): ```npm run build:firebug```
* Development mode (autoreload + firebug lite + unit tests): ```npm run build:dev:firebug```
* Unit tests: ```npm run test```


## Production mode
Includes AoT
```sh
npm run build:prod
npm run server
```

## Deploy on AWS Lambda
```sh
npm run build:deploy:aws
```

## Deploy on Google Cloud Functions
```sh
npm run build:deploy:gcloud
```

## <a name="todo"></a> To do
* CLI support [tracked in #144](https://github.com/maciejtreder/angular-universal-pwa/issues/144)
* microservices support - make replacement eligible external module without recompiling whole app
* [ng-http-sw-proxy (all requests done offline, are synced when app comes back online)](https://github.com/maciejtreder/ng-http-sw-proxy) - not working since Angular 5.x (more info can be found in [this issue](https://github.com/webmaxru/pwatter/issues/2))
* e2e tests


## Won't implement:
* load static content from S3 (JavaScript, styles, images):
    * when serving all static content from S3 load speed up is not really visible (increase is around ~0,2 sec),
    * problems with CORS on Chrome,
    * problems with compression of some files (.js files are not compressed in some cases)
    * needs a lot of manual setup (cloudfront setup etc.)

## <a name="funding"></a> Funding

You can support development of this project via
[Open Collective](https://opencollective.com/angular-universal-pwa),
[Donorbox](https://donorbox.org/angular-universal-pwa),
[Liberapay](https://liberapay.com/maciejtreder/donate),


### Open Collective Backers

Support this project with a monthly donation and help us continue our activities. [[Become a backer](https://opencollective.com/angular-universal-pwa#backer)]

<a href="https://opencollective.com/angular-universal-pwa/backer/0/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/0/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/1/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/1/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/2/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/2/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/3/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/3/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/4/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/4/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/5/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/5/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/6/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/6/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/7/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/7/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/8/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/8/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/9/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/9/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/10/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/10/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/11/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/11/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/12/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/12/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/13/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/13/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/14/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/14/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/15/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/15/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/16/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/16/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/17/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/17/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/18/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/18/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/19/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/19/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/20/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/20/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/21/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/21/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/22/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/22/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/23/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/23/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/24/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/24/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/25/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/25/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/26/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/26/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/27/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/27/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/28/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/28/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/backer/29/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/backer/29/avatar.svg"></a>

### Open Collective Sponsors

Become a sponsor and get your logo on our README on GitHub with a link to your site. [[Become a sponsor](https://opencollective.com/angular-universal-pwa#sponsor)]

<a href="https://opencollective.com/angular-universal-pwa/sponsor/0/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/1/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/2/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/3/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/4/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/5/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/6/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/7/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/8/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/9/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/9/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/10/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/10/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/11/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/11/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/12/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/12/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/13/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/13/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/14/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/14/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/15/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/15/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/16/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/16/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/17/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/17/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/18/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/18/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/19/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/19/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/20/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/20/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/21/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/21/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/22/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/22/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/23/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/23/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/24/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/24/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/25/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/25/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/26/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/26/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/27/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/27/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/28/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/28/avatar.svg"></a>
<a href="https://opencollective.com/angular-universal-pwa/sponsor/29/website" target="_blank"><img src="https://opencollective.com/angular-universal-pwa/sponsor/29/avatar.svg"></a>





## <a name="credentials"></a> Credentials
* Checkout my [home page](https://www.maciejtreder.com) and find out more about me
* Built on top of [ng-universal-demo](https://github.com/FrozenPandaz/ng-universal-demo)
