[![Maintainability](https://api.codeclimate.com/v1/badges/feb1889ed8bd09672fae/maintainability)](https://codeclimate.com/github/maciejtreder/ng-toolkit/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/feb1889ed8bd09672fae/test_coverage)](https://codeclimate.com/github/maciejtreder/ng-toolkit/test_coverage) 
[![Build Status](https://travis-ci.org/maciejtreder/ng-toolkit.png)](https://travis-ci.org/maciejtreder/ng-toolkit)
[![Dependency Status](https://david-dm.org/maciejtreder/ng-toolkit.svg)](https://david-dm.org/maciejtreder/ng-toolkit)
[![Backers on Open Collective](https://opencollective.com/ng-toolkit/backers/badge.svg)](#backers) 
[![Sponsors on Open Collective](https://opencollective.com/ng-toolkit/sponsors/badge.svg)](#sponsors)
[![npm version](https://badge.fury.io/js/%40ng-toolkit%2Fserverless.svg)](https://badge.fury.io/js/%40ng-toolkit%2Fserverless)

# Serverless support for your Angular application [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&logo=twitter)](https://twitter.com/intent/tweet?text=Just%20started%20using%20@ng-toolkit/serverless&url=https://github.com/maciejtreder/ng-toolkit&via=maciejtreder&hashtags=angular,pwa,webapp,software,developers,serverless,firebase)

### _**Star it and share with others!**_
_This is part of the @ng-toolkit project. [Check main page for more tools](https://github.com/maciejtreder/ng-toolkit)_

Add serverless support (AWS Lambda; Google Cloud Functions & Firebase) to your Angular project. Supports as well client-side-only projects as Angular Universal projects (server side rendering).
[Check deep overview article on Medium](https://medium.com/@maciejtreder/angular-serverless-a713e86ea07a)

## Live demo
[Angular Universal PWA on AWS Lambda + API Gateway](https://www.angular-toolkit.maciejtreder.com)

## Content
 - [Getting started](#start)
 - [Question, Problem, Feature Request](#question)
 - [Support @ng-toolkit](#funding)

## <a name="start"></a> Getting started
Create or navigate into your project:
```bash
ng new myApp
cd myApp
```



### AWS Lambda & Google Cloud Functions
```
ng add @ng-toolkit/serverless --provider aws
```

Deploy to "maintenance link" (non customized - ie: https://123456.execute-api.eu-central-1.amazonaws.com/production)
```
npm run build:serverless:deploy
```

Deploy to customized link (example.com):
```
npm run build:prod:deploy
```

You can read more about [using custom domain in AWS Lambda in this Medium post](https://medium.com/@maciejtreder/custom-domain-in-aws-api-gateway-a2b7feaf9c74) or [in the official AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html).

### Firebase

```
ng add @ng-toolkit/serverless --provider firebase --firebaseProject [your_project_ID]
npm run build:prod:deploy
```

Project ID, can be found in project settings:
![where to find project ID](https://raw.githubusercontent.com/maciejtreder/ng-toolkit/master/schematics/serverless/project_id.png)


You can chain this package with:
- [@ng-toolkit/universal](https://github.com/maciejtreder/ng-toolkit/blob/master/schematics/universal)
- [@ng-toolkit/pwa](https://github.com/maciejtreder/ng-toolkit/blob/master/schematics/pwa)
- [@ng-toolkit/firebug](https://github.com/maciejtreder/ng-toolkit/blob/master/schematics/firebug)


## <a name="question"></a> Looking for something more?
Feel free to [create issue with your feature request](https://github.com/maciejtreder/angular-toolkit/issues/new)

## <a name="funding"></a> Support @ng-toolkit/serverless

You can support development of this project via:
- [Open Collective](https://opencollective.com/ng-toolkit)
- [Donorbox](https://donorbox.org/ng-toolkit)
- [Liberapay](https://liberapay.com/maciejtreder/donate)
- [Paypal](https://www.paypal.me/ngtoolkit)

If you want, you can be listed on the [List of donors](https://www.angular-universal-pwa.maciejtreder.com/donors) on the demo page.


### Open Collective Backers

Support this project with a monthly donation and help us continue our activities. [[Become a backer](https://opencollective.com/ng-toolkit#backer)]

<a href="https://opencollective.com/ng-toolkit/backer/0/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/0/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/1/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/1/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/2/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/2/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/3/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/3/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/4/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/4/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/5/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/5/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/6/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/6/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/7/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/7/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/8/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/8/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/9/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/9/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/10/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/10/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/11/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/11/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/12/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/12/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/13/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/13/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/14/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/14/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/15/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/15/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/16/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/16/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/17/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/17/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/18/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/18/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/19/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/19/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/20/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/20/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/21/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/21/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/22/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/22/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/23/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/23/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/24/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/24/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/25/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/25/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/26/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/26/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/27/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/27/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/28/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/28/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/backer/29/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/backer/29/avatar.svg"></a>

### Open Collective Sponsors

Become a sponsor and get your logo on our README on GitHub with a link to your site. [[Become a sponsor](https://opencollective.com/ng-toolkit#sponsor)]

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
<a href="https://opencollective.com/ng-toolkit/sponsor/10/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/10/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/11/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/11/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/12/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/12/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/13/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/13/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/14/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/14/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/15/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/15/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/16/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/16/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/17/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/17/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/18/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/18/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/19/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/19/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/20/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/20/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/21/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/21/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/22/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/22/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/23/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/23/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/24/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/24/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/25/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/25/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/26/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/26/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/27/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/27/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/28/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/28/avatar.svg"></a>
<a href="https://opencollective.com/ng-toolkit/sponsor/29/website" target="_blank"><img src="https://opencollective.com/ng-toolkit/sponsor/29/avatar.svg"></a>



## <a name="credentials"></a> Credentials
* Checkout my [home page](https://www.maciejtreder.com) and find out more about me
