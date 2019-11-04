# @ng-toolkit [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&logo=twitter)](https://twitter.com/intent/tweet?text=Check%20out%20ng-toolkit%20-%20collection%20of%20great%20tools%20for%20angular&url=https://github.com/maciejtreder/ng-toolkit&via=maciejtreder&hashtags=angular,pwa,webapp,software,developers)

<!-- TODO: Provide a quick summary of the package -->

This project has two faces:

- First, a Angular Universal PWA boilerplate, prepared for easy deployment on Serverless environment. The boilerplate contains all of the best practices and is continously evolving. [Find out more about the boilerplate here.](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/init)
- Second, a collection of `schematics` (used with the `ng add` command) which can be applied to existing Angular projects. All `schematics` comes from the boilerplate mentioned above. The main goal is to make those schematics **interchangeably** (developer can apply them in any order)!

## _**Star it and share with others!**_

**[Online Demo: Angular Universal PWA on AWS Lambda + API Gateway](https://www.angular-universal-pwa.maciejtreder.com)**

[![Maintainability](https://api.codeclimate.com/v1/badges/feb1889ed8bd09672fae/maintainability)](https://codeclimate.com/github/maciejtreder/angular-universal-pwa/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/feb1889ed8bd09672fae/test_coverage)](https://codeclimate.com/github/maciejtreder/angular-universal-pwa/test_coverage)
[![Build Status](https://travis-ci.org/maciejtreder/ng-toolkit.png)](https://travis-ci.org/maciejtreder/ng-toolkit)
[![Backers on Open Collective](https://opencollective.com/ng-toolkit/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/ng-toolkit/sponsors/badge.svg)](#sponsors)

### Dependency Status

| Package             | Dependencies                                                                                                                                                                | Dev Dependencies | npm version
| ------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------- | :--------------- |
| `ng-toolkit/_utils` | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/status.svg?path=schematics/_utils)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/_utils) | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/dev-status.svg?path=schematics/_utils&type=dev)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/_utils?type=dev) | [![npm version](https://badge.fury.io/js/%40ng-toolkit%2F_utils.svg)](https://badge.fury.io/js/%40ng-toolkit%2F_utils) |
| `ng-toolkit/serverless` | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/status.svg?path=schematics/serverless)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/serverless) | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/dev-status.svg?path=schematics/serverless&type=dev)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/serverless?type=dev) | [![npm version](https://badge.fury.io/js/%40ng-toolkit%2Fserverless.svg)](https://badge.fury.io/js/%40ng-toolkit%2Fserverless) |
| `ng-toolkit/pwa` | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/status.svg?path=schematics/pwa)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/pwa) | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/dev-status.svg?path=schematics/pwa&type=dev)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/pwa?type=dev) | [![npm version](https://badge.fury.io/js/%40ng-toolkit%2Fpwa.svg)](https://badge.fury.io/js/%40ng-toolkit%2Fpwa) |
| `ng-toolkit/universal` | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/status.svg?path=schematics/universal)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/universal) | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/dev-status.svg?path=schematics/universal&type=dev)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/universal?type=dev) | [![npm version](https://badge.fury.io/js/%40ng-toolkit%2Funiversal.svg)](https://badge.fury.io/js/%40ng-toolkit%2Funiversal) |
| `ng-toolkit/firebug` | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/status.svg?path=schematics/firebug)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/firebug) | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/dev-status.svg?path=schematics/firebug&type=dev)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/firebug?type=dev) | [![npm version](https://badge.fury.io/js/%40ng-toolkit%2Ffirebug.svg)](https://badge.fury.io/js/%40ng-toolkit%2Ffirebug) |
| `ng-toolkit/init` | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/status.svg?path=schematics/init)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/init) | [![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit/dev-status.svg?path=schematics/init&type=dev)](https://david-dm.org/maciejtreder/ng-toolkit?path=schematics/init?type=dev) | [![npm version](https://badge.fury.io/js/%40ng-toolkit%2Finit.svg)](https://badge.fury.io/js/%40ng-toolkit%2Finit) |

## Content

- [What's inside](#quickOverview)
  - [Application starter/boilerplate](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/init)
  - [Angular Universal/server-side rendering](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/universal)
  - [Serverless support (Firebase, AWS Lambda, Google Cloud Functions)](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/serverless)
- [Planned features](#planned-features)
- [Question, Problem, Feature Request](#question)
- [Support @ng-toolkit](#funding)

## <a name="quickOverview"> What's inside

### **PWA starter**

```console
npm install -g @ng-toolkit/init
ng new --collection @ng-toolkit/init myApp [--provider --firebaseProject --gaTrackingCode --firebug]
```

- [Read more documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/init/README.md)

### **PWA - @angular/pwa extension**

Add update mechanism and server-side rendering fixes to your PWA

```console
ng add @ng-toolkit/pwa [--serverModule]
```

- [Read more documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/pwa/README.md)

### **Serverless (Firebase, AWS Lambda, Google Cloud Functions)**

Make your app deployable on serverless environment (FaaS)

```console
ng add @ng-toolkit/serverless [--provider --firebaseProject]
```

- [Read more documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/serverless/README.md)
- [Read article about serverless with @ng-toolkit](https://medium.com/@maciejtreder/angular-serverless-a713e86ea07a)

### **Angular Universal**

Add server-side rendering and improve SEO of your app

```console
ng add @ng-toolkit/universal
```

- [Read more documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/universal/README.md)
- [Read article about server-side rendering with @ng-toolkit](https://medium.com/@maciejtreder/angular-server-side-rendering-with-ng-toolkit-universal-c08479ca688)

### **Firebug-lite**

Add firebug-lite to your Angular app

```console
ng add @ng-toolkit/firebug
```

- [Read more documentation](https://github.com/maciejtreder/ng-toolkit/tree/master/schematics/firebug/README.md)

## Planned features

- [@ng-toolkit/googleAnalytics](https://github.com/maciejtreder/ng-toolkit/issues/225) - tracking user and JS exceptions in Google Analytics
- [@ng-toolkit/compodoc](https://github.com/maciejtreder/ng-toolkit/issues/275) - introduce [compodoc](https://github.com/compodoc/compodoc) - documentation tool for your angular app
- @ng-toolkit/safariPush - add pushes for Safari users

### <a name="question"></a> Looking for something more?

Feel free to [create issue with your feature request](https://github.com/maciejtreder/ng-toolkit/issues/new)

## <a name="funding"></a> Support @ng-toolkit

You can support development of this project via:

- [Open Collective](https://opencollective.com/ng-toolkit)
- [Donorbox](https://donorbox.org/ng-toolkit)
- [Liberapay](https://liberapay.com/maciejtreder/donate)
- [Paypal](https://www.paypal.me/ngtoolkit)

If you want, you can be listed on the [List of donors](https://www.angular-universal-pwa.maciejtreder.com/donors) on the demo page.

### *Open Collective Backers*

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

- Checkout my [home page](https://www.maciejtreder.com) and find out more about me
