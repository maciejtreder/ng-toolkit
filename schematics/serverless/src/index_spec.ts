import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { checkIfFileExists, shouldContainEntry } from '@ng-toolkit/_utils/testing';
import { Tree } from '@angular-devkit/schematics';

const collectionPath = path.join(__dirname, '../collection.json');

describe('Serverless', () => {
    let appTree: UnitTestTree;

    const schematicRunner = new SchematicTestRunner('@ng-toolkit/serverless', collectionPath);

    const defaultOptions: any = {
        project: 'foo',
        disableBugsnag: true,
        directory: '/foo'
    };

    const appOptions: any = {
        name: 'foo',
        version: '6.0.0',
    };

    beforeEach((done) => {
        appTree = new UnitTestTree(Tree.empty());
        schematicRunner.runExternalSchematicAsync('@schematics/angular', 'ng-new', appOptions, appTree).subscribe(tree => {
            appTree = tree
            done();
        });
    });

    describe('AWS Lambda', () => {
        beforeAll(() => defaultOptions['provider'] = 'aws');
        afterAll(() => delete defaultOptions['provider']);
        it('Should create serverless configuration for AWS', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                checkIfFileExists(tree, `${defaultOptions.directory}/serverless.yml`);
                checkIfFileExists(tree, `${defaultOptions.directory}/lambda.js`);
                shouldContainEntry(tree, `${defaultOptions.directory}/serverless.yml`, /provider:[\s\S]*name:\saws/);
                done();
            });
        });

        it('Should add proper scripts to package.json', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:browser:serverless": "ng build --prod --base-href \/production\/"/);
                done();
            });
        });
    });

    describe('Firebase', () => {
        beforeAll(() => defaultOptions['provider'] = 'firebase');
        afterAll(() => delete defaultOptions['provider']);

        it('Should create files', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                checkIfFileExists(tree, `${defaultOptions.directory}/functions/package.json`);
                checkIfFileExists(tree, `${defaultOptions.directory}/functions/index.js`);
                checkIfFileExists(tree, `${defaultOptions.directory}/.firebaserc`);
                checkIfFileExists(tree, `${defaultOptions.directory}/firebase.json`);
                done();
            });
        });

        it('Should add proper scripts to package.json', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:browser:serverless": "ng build --prod --base-href \//);
                done();
            });
        });
    });

    describe('Google Cloud Functions', () => {
        beforeAll(() => defaultOptions['provider'] = 'gcloud');
        afterAll(() => delete defaultOptions['provider']);
        it('Should create serverless configuration and files', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                checkIfFileExists(tree, `${defaultOptions.directory}/serverless.yml`);
                checkIfFileExists(tree, `${defaultOptions.directory}/index.js`);
                shouldContainEntry(tree, `${defaultOptions.directory}/serverless.yml`, /provider:[\s\S]*name:\sgoogle/);
                done();
            });
        });

        it('Should add proper scripts to package.json', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:browser:serverless": "ng build --prod --base-href \/http\/"/);
                done();
            });
        });
    });

    it('By default AWS should be choosen as provider', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, `${defaultOptions.directory}/serverless.yml`);
            checkIfFileExists(tree, `${defaultOptions.directory}/lambda.js`);
            shouldContainEntry(tree, `${defaultOptions.directory}/serverless.yml`, /provider:[\s\S]*name:\saws/);
            done();
        });
    });

    it('Should create all common files', (done)=> {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, `${defaultOptions.directory}/local.js`);
            checkIfFileExists(tree, `${defaultOptions.directory}/server.ts`);
            checkIfFileExists(tree, `${defaultOptions.directory}/webpack.server.config.js`);
            checkIfFileExists(tree, `${defaultOptions.directory}/ng-toolkit.json`);
            done();
        });
    });

    it('Should add proper scripts to package.json', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:browser:prod": "ng build --prod"/);
            shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:prod": "npm run build:browser:prod && npm run build:server:prod"/);
            shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"server": "node local.js"/);
            shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:prod:deploy": "npm run build:prod && npm run deploy"/);
            shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:server:prod": "webpack --config webpack.server.config.js --progress --colors"/);
            shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:serverless": "npm run build:browser:serverless && npm run build:server:serverless"/);
            shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:serverless:deploy": "npm run build:serverless && npm run deploy"/);
            shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:server:serverless": "webpack --config webpack.server.config.js --progress --colors"/);
            done();
        });
    });

    describe('After Universal', () => {
        beforeEach((done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                schematicRunner.runExternalSchematicAsync('@ng-toolkit/universal', 'ng-add', defaultOptions, tree).subscribe(tree => {
                    appTree = tree;
                    done();
                });
            });
        });

        describe('AWS Lambda', () => {
            beforeAll(() => defaultOptions['provider'] = 'aws');
            afterAll(() => delete defaultOptions['provider']);
            it('Should create serverless configuration for AWS', (done) => {
                schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                    checkIfFileExists(tree, `${defaultOptions.directory}/serverless.yml`);
                    checkIfFileExists(tree, `${defaultOptions.directory}/lambda.js`);
                    shouldContainEntry(tree, `${defaultOptions.directory}/serverless.yml`, /provider:[\s\S]*name:\saws/);
                    done();
                });
            });
    
            it('Should add proper scripts to package.json', (done) => {
                schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                    shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:browser:serverless": "ng build --prod --base-href \/production\/"/);
                    done();
                });
            });
        });
    
        fdescribe('Firebase', () => {
            beforeAll(() => defaultOptions['provider'] = 'firebase');
            afterAll(() => delete defaultOptions['provider']);
    
            it('Should create files', (done) => {
                schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                    checkIfFileExists(tree, `${defaultOptions.directory}/functions/package.json`);
                    checkIfFileExists(tree, `${defaultOptions.directory}/functions/index.js`);
                    checkIfFileExists(tree, `${defaultOptions.directory}/.firebaserc`);
                    checkIfFileExists(tree, `${defaultOptions.directory}/firebase.json`);
                    done();
                });
            });
    
            it('Should add proper scripts to package.json', (done) => {
                schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                    shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:browser:serverless": "ng build --prod --base-href \//);
                    done();
                });
            });
        });
    
        describe('Google Cloud Functions', () => {
            beforeAll(() => defaultOptions['provider'] = 'gcloud');
            afterAll(() => delete defaultOptions['provider']);
            it('Should create serverless configuration and files', (done) => {
                schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                    checkIfFileExists(tree, `${defaultOptions.directory}/serverless.yml`);
                    checkIfFileExists(tree, `${defaultOptions.directory}/index.js`);
                    shouldContainEntry(tree, `${defaultOptions.directory}/serverless.yml`, /provider:[\s\S]*name:\sgoogle/);
                    done();
                });
            });
    
            it('Should add proper scripts to package.json', (done) => {
                schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                    shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:browser:serverless": "ng build --prod --base-href \/http\/"/);
                    done();
                });
            });
        });
    
        it('By default AWS should be choosen as provider', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                checkIfFileExists(tree, `${defaultOptions.directory}/serverless.yml`);
                checkIfFileExists(tree, `${defaultOptions.directory}/lambda.js`);
                shouldContainEntry(tree, `${defaultOptions.directory}/serverless.yml`, /provider:[\s\S]*name:\saws/);
                done();
            });
        });
    
        it('Should create all common files', (done)=> {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                checkIfFileExists(tree, `${defaultOptions.directory}/local.js`);
                checkIfFileExists(tree, `${defaultOptions.directory}/server.ts`);
                checkIfFileExists(tree, `${defaultOptions.directory}/webpack.server.config.js`);
                checkIfFileExists(tree, `${defaultOptions.directory}/ng-toolkit.json`);
                checkIfFileExists(tree, `${defaultOptions.directory}/src/environments/environment.serverless.ts`);
                done();
            });
        });
    
        it('Should add proper scripts to package.json', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:browser:prod": "ng build --prod"/);
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:prod": "npm run build:browser:prod && npm run build:server:prod"/);
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"server": "node local.js"/);
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:prod:deploy": "npm run build:prod && npm run deploy"/);
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:server:prod": "ng run foo:server && webpack --config webpack.server.config.js --progress --colors"/);
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:serverless": "npm run build:browser:serverless && npm run build:server:serverless"/);
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:serverless:deploy": "npm run build:serverless && npm run deploy"/);
                shouldContainEntry(tree, `${defaultOptions.directory}/package.json`, /"build:server:serverless": "ng run foo:server:serverless && webpack --config webpack.server.config.js --progress --colors"/);
                done();
            });
        });
    });
});