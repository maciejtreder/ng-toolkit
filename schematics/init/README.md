[![Maintainability](https://api.codeclimate.com/v1/badges/feb1889ed8bd09672fae/maintainability)](https://codeclimate.com/github/maciejtreder/angular-universal-pwa/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/feb1889ed8bd09672fae/test_coverage)](https://codeclimate.com/github/maciejtreder/angular-universal-pwa/test_coverage) 
[![Build Status](https://travis-ci.org/maciejtreder/ng-toolkit.png)](https://travis-ci.org/maciejtreder/ng-toolkit)
[![Dependency Status](https://david-dm.org/maciejtreder/angular-universal-pwa.svg)](https://david-dm.org/maciejtreder/angular-universal-pwa)
[![Backers on Open Collective](https://opencollective.com/ng-toolkit/backers/badge.svg)](#backers) 
[![Sponsors on Open Collective](https://opencollective.com/ng-toolkit/sponsors/badge.svg)](#sponsors)
[![npm version](https://badge.fury.io/js/%40ng-toolkit%2Finit.svg)](https://badge.fury.io/js/%40ng-toolkit%2Finit)

# Angular Universal PWA starter/boilerplate (CLI schematics) [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&logo=twitter)](https://twitter.com/intent/tweet?text=Check%20out%20ng-toolkit%20-%20collection%20of%20great%20tools%20for%20angular&url=https://github.com/maciejtreder/ng-toolkit&via=maciejtreder&hashtags=angular,pwa,webapp,software,developers)
![Lighthouse report](https://raw.github.com/maciejtreder/ng-toolkit/master/application/src/assets/img/lighthouse_report.png)

### _**Star it and share with others!**_
_This is part of the @ng-toolkit project. [Check main page for more](https://github.com/maciejtreder/ng-toolkit)_

This is boilerplate for **(PWA) progressive web app** with Angular Universal (serverside rendering).
It is prepared to be easily deployed on serverless environment (Google Cloud Functions & AWS Lambda supported).

## Live demo
[Angular Universal PWA on AWS Lambda + API Gateway](https://www.angular-universal-pwa.maciejtreder.com)

## Content
 - [What's inside](#pwa)
 - [Getting started](#start)
 - [Deployment](#deploy)
 - [To do](#todo)
 - [Question, Problem, Feature Request](#question)
 - [Support @ng-toolkit/init](#funding)



## <a name="pwa">What's inside</a>

* PWA - content is cached and available offline, it can be also installed as native app on Android devices and Google Chrome
* AMP - Accelerated Mobile Pages - super fast initial load (down to ~650ms)
* Push notifications:
    * Vapid webpush (Chrome and Firefox) - Using [aws-sns-webpush](https://github.com/maciejtreder/aws-sns-webpush) as back-end
    * Safari push - Using [aws-sns-webpush](https://github.com/maciejtreder/aws-sns-webpush) as back-end
* Server-side rendering with Angular Universal
* TransferState
* Lazy loading modules
* External modules (You can split your application into multiple projects and lazy-load them, [read more here](https://github.com/maciejtreder/angular-external-module)) [TBD after CLI merge - [#150](https://github.com/maciejtreder/ng-toolkit/issues/150)]
* Angular Material
* Unit tests
* Firebug Lite (great solution for development on touch-screen devices, ie: tablets)

### Used frameworks/technologies
* Angular 6.x
* Webpack
* Serverless framework

### <a name="start"></a> Getting Started
Whatch on Youtube:

[![How to start project with ng-toolkit](https://img.youtube.com/vi/FPWRXSzhjug/0.jpg)](https://www.youtube.com/watch?v=FPWRXSzhjug)

### Using Angular CLI schematics

```bash
npm install -g @ng-toolkit/init
```

Create project:
```bash
ng new --collection @ng-toolkit/init myApp
cd myApp
npm start
```

#### CLI params
* `--provider` - What serverless provider you want to use? (`aws` | `gcloud` | `firebase`) - default `aws`
* `--firebaseProject` - projectID, used when you choose `firebase` in above param
* `--gaTrackingCode` - Provide your Google Analytics tracking code, to enable GA (ie `--gaTrackingCode UA-123456`)
* `--firebug` - Decide if you want to download firebug-lite (`true` | `false`) - default `false`

### Cloning the repo 
```bash
git clone https://github.com/maciejtreder/ng-toolkit.git
cd ng-toolkit/application
npm install
npm start
```

### Running modes
* Development mode (autoreload only): ```npm start```
* Development mode (autoreload + unit tests): ```npm run build:dev```
* Development mode (autoreload + firebug lite): ```npm run build:firebug```
* Development mode (autoreload + firebug lite + unit tests): ```npm run build:dev:firebug```
* Unit tests: ```npm run test```


### <a name="deploy"></a> Deployment
### Production mode with NodeJS
```sh
npm run build:prod
npm run server
```
### Serverless environments
#### Maintenance link (not customized)
```
npm run build:serverless:deploy
```
#### Custom link
```
npm run build:prod:deploy
```
[Check out Serverless library documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/serverless)
[Read more about link customization in AWS API Gateway & Lambda](https://medium.com/@maciejtreder/custom-domain-in-aws-api-gateway-a2b7feaf9c74)

## <a name="todo"></a> To do
* prerender app for 'no-backend' hosting
* microservices support - make replacement eligible external module without recompiling whole app
* [ng-http-sw-proxy (all requests done offline, are synced when app comes back online)](https://github.com/maciejtreder/ng-http-sw-proxy) - not working since Angular 5.x (more info can be found in [this issue](https://github.com/webmaxru/pwatter/issues/2))
* e2e tests


## Won't implement:
* load static content from S3 (JavaScript, styles, images):
    * when serving all static content from S3 load speed up is not really visible (increase is around ~0,2 sec),
    * problems with CORS on Chrome,
    * problems with compression of some files (.js files are not compressed in some cases)
    * needs a lot of manual setup (cloudfront setup etc.)


## <a name="question"></a> Looking for something more?
Feel free to [create issue with your feature request](https://github.com/maciejtreder/ng-toolkit/issues/new)


## <a name="funding"></a> Support @ng-toolkit/init

You can support development of this project via
- [Open Collective](https://opencollective.com/ng-toolkit),
- [Donorbox](https://donorbox.org/ng-toolkit),
- [Liberapay](https://liberapay.com/maciejtreder/donate)

If you want, you can be listed on the [List of donors](https://www.angular-universal-pwa.maciejtreder.com/donors) on the demo page.

### Open Collective Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/ng-toolkit#backer)]

<a href="https://opencollective.com/ng-toolkit#backers" target="_blank"><img src="https://opencollective.com/ng-toolkit/backers.svg?width=890"></a>


### Open Collective Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/ng-toolkit#sponsor)]

<a href="https://opencollective.com/ng-toolkit/sponsor/0/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/1/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/2/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/3/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/4/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/5/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/6/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/7/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/8/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/9/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/9/avatar.svg"></a>

## <a name="credentials"></a> Credentials
* Checkout my [home page](https://www.maciejtreder.com) and find out more about me