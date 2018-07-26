[![Maintainability](https://api.codeclimate.com/v1/badges/feb1889ed8bd09672fae/maintainability)](https://codeclimate.com/github/maciejtreder/angular-universal-pwa/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/feb1889ed8bd09672fae/test_coverage)](https://codeclimate.com/github/maciejtreder/angular-universal-pwa/test_coverage) 
[![Build Status](https://travis-ci.org/maciejtreder/ng-toolkit.png)](https://travis-ci.org/maciejtreder/ng-toolkit)
[![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit.svg)](https://david-dm.org/maciejtreder/ng-toolkit)
[![Backers on Open Collective](https://opencollective.com/ng-toolkit/backers/badge.svg)](#backers) 
[![Sponsors on Open Collective](https://opencollective.com/ng-toolkit/sponsors/badge.svg)](#sponsors)
[![npm version](https://badge.fury.io/js/%40ng-toolkit%2Finit.svg)](https://badge.fury.io/js/%40ng-toolkit%2Finit)

# @ng-toolkit [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&logo=twitter)](https://twitter.com/intent/tweet?text=Check%20out%20ng-toolkit%20-%20collection%20of%20great%20tools%20for%20angular&url=https://github.com/maciejtreder/ng-toolkit&via=maciejtreder&hashtags=angular,pwa,webapp,software,developers)

This project has two faces: 
 - First, a Angular Universal PWA boilerplate, prepared for easy deployment on Serverless environment. The boilerplate contains all of the best practices and is continously evolving. [Find out more about the boilerplate here.](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/init)
 - Second, a collection of `schematics` (used with the `ng add` command) which can be applied to existing Angular projects. All `schematics` comes from the boilerplate mentioned above. The main goal is to make those schematics **interchangeably** (developer can apply them in any order)!

### _**Star it and share with others!**_
**[Online Demo: Angular Universal PWA on AWS Lambda + API Gateway](https://www.angular-universal-pwa.maciejtreder.com)**

## Content
 - [What's inside](#quickOverview):
    - [Application starter/boilerplate](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/init) 
    - [Angular Universal/server-side rendering](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/universal) 
    - [Serverless support (Firebase, AWS Lambda, Google Cloud Functions)](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/serverless) 
 - [Planned features](#planned-features)
 - [Question, Problem, Feature Request](#question)
 - [Support @ng-toolkit](#funding)


## <a name="quickOverview">  What's inside

#### PWA starter:

```
npm install -g @ng-toolkit/init
ng new --collection @ng-toolkit/init myApp [--provider --firebaseProject --gaTrackingCode --firebug]
```
- [Read more documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/init/README.md)

#### PWA - @angular/pwa extension
Add update mechanism and server-side rendering fixes to your PWA
```
ng add @ng-toolkit/pwa [--serverModule]
```
- [Read more documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/pwa/README.md)

#### Serverless (Firebase, AWS Lambda, Google Cloud Functions):
Make your app deployable on serverless environment (FaaS)
```
ng add @ng-toolkit/serverless [--provider --firebaseProject]
```
- [Read more documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/serverless/README.md)
- [Read article about serverless with @ng-toolkit](https://medium.com/@maciejtreder/angular-serverless-a713e86ea07a)

#### Angular Universal
Add server-side rendering and improve SEO of your app
```
ng add @ng-toolkit/universal
```
- [Read more documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/universal/README.md)
- [Read article about server-side rendering with @ng-toolkit](https://medium.com/@maciejtreder/angular-server-side-rendering-with-ng-toolkit-universal-c08479ca688)

#### Firebug-lite
Add firebug-lite to your Angular app
```
ng add @ng-toolkit/firebug
```
- [Read more documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/firebug/README.md)

## Planned features
- [@ng-toolkit/googleAnalytics](https://github.com/maciejtreder/ng-toolkit/issues/225) - tracking user and JS exceptions in Google Analytics
- [@ng-toolkit/compodoc](https://github.com/maciejtreder/ng-toolkit/issues/275) - introduce [compodoc](https://github.com/compodoc/compodoc) - documentation tool for your angular app
- @ng-toolkit/safariPush - add pushes for Safari users

## <a name="question"></a> Looking for something more?
Feel free to [create issue with your feature request](https://github.com/maciejtreder/ng-toolkit/issues/new)


## <a name="funding"></a> Support @ng-toolkit

You can support development of this project via:
- [Open Collective](https://opencollective.com/ng-toolkit)
- [Donorbox](https://donorbox.org/ng-toolkit)
- [Liberapay](https://liberapay.com/maciejtreder/donate)
- [Paypal](https://www.paypal.me/ngtoolkit)

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
