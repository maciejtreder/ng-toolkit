# Angular Universal starter for serverless environment

## Live demo
[Angular Universal on AWS Lambda + API Gateway](https://www.angular-universal-serverless.maciejtreder.com)

## What's inside
* Webpack
* UglifyJS
* OptimizeJS
* Sass loader


## Get Started
```sh
npm install
npm start
```
## Developement mode
* Terminal 1: ```npm run watch```
* Wait for the build to finish
* Terminal 2: ```npm run server```

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

Built on top of [ng-universal-demo](https://github.com/FrozenPandaz/ng-universal-demo)
