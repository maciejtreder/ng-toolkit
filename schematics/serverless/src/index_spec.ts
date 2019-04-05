import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { checkIfFileExists, shouldContainEntry } from '@ng-toolkit/_utils/testing';
// import { Tree } from '@angular-devkit/schematics';

const collectionPath = path.join(__dirname, '../collection.json');

describe('Serverless', () => {
    let appTree: UnitTestTree;

    const schematicRunner = new SchematicTestRunner('@ng-toolkit/serverless', collectionPath);

    const defaultOptions: any = {
        project: 'foo',
        disableBugsnag: true
    };

    // const appOptions: any = {
    //     name: 'foo',
    //     version: '6.0.0',
    // };

    beforeEach( (done) => {
        appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'workspace', {
            name: 'workspace',
            version: '6.0.0',
            newProjectRoot: 'projects'
        });

        schematicRunner.runExternalSchematicAsync('@schematics/angular', 'application', {name: 'foo'}, appTree).subscribe(tree => {
            appTree = tree;
            done();
        });



        // appTree = new UnitTestTree(Tree.empty());
        // schematicRunner.runExternalSchematicAsync('@schematics/angular', 'ng-new', appOptions, appTree).subscribe(tree => {
        //     appTree = tree
        //     done();
        // });
    });

    describe('AWS Lambda', () => {
        beforeAll(() => defaultOptions['provider'] = 'aws');
        afterAll(() => delete defaultOptions['provider']);
        xit('Should create serverless configuration for AWS', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                checkIfFileExists(tree, `serverless.yml`);
                checkIfFileExists(tree, `lambda.js`);
                shouldContainEntry(tree, `serverless.yml`, /provider:[\s\S]*name:\saws/);
                done();
            });
        });

        xit('Should add proper scripts to package.json', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                shouldContainEntry(tree, `package.json`, /"build:browser:serverless": "ng build --prod --base-href \/production\/"/);
                done();
            });
        });
    });

    describe('Firebase', () => {
        beforeAll(() => defaultOptions['provider'] = 'firebase');
        afterAll(() => delete defaultOptions['provider']);

        xit('Should create files', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                checkIfFileExists(tree, `functions/package.json`);
                checkIfFileExists(tree, `functions/index.js`);
                checkIfFileExists(tree, `.firebaserc`);
                checkIfFileExists(tree, `firebase.json`);
                done();
            });
        });

        xit('Should add proper scripts to package.json', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                shouldContainEntry(tree, `package.json`, /"build:browser:serverless": "ng build --prod --base-href \//);
                done();
            });
        });
    });

    describe('Google Cloud Functions', () => {
        beforeAll(() => defaultOptions['provider'] = 'gcloud');
        afterAll(() => delete defaultOptions['provider']);
        xit('Should create serverless configuration and files', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                checkIfFileExists(tree, `serverless.yml`);
                checkIfFileExists(tree, `index.js`);
                shouldContainEntry(tree, `serverless.yml`, /provider:[\s\S]*name:\sgoogle/);
                done();
            });
        });

        xit('Should add proper scripts to package.json', (done) => {
            schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
                shouldContainEntry(tree, `package.json`, /"build:browser:serverless": "ng build --prod --base-href \/http\/"/);
                done();
            });
        });
    });

    xit('By default AWS should be choosen as provider', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, `serverless.yml`);
            checkIfFileExists(tree, `lambda.js`);
            shouldContainEntry(tree, `serverless.yml`, /provider:[\s\S]*name:\saws/);
            done();
        });
    });

    xit('Should create all common files', (done)=> {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, `local.js`);
            checkIfFileExists(tree, `server.ts`);
            checkIfFileExists(tree, `webpack.server.config.js`);
            checkIfFileExists(tree, `ng-toolkit.json`);
            done();
        });
    });

    xit('Should add proper scripts to package.json', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            shouldContainEntry(tree, `package.json`, /"build:browser:prod": "ng build --prod"/);
            shouldContainEntry(tree, `package.json`, /"build:prod": "npm run build:browser:prod && npm run build:server:prod"/);
            shouldContainEntry(tree, `package.json`, /"server": "node local.js"/);
            shouldContainEntry(tree, `package.json`, /"build:prod:deploy": "npm run build:prod && npm run deploy"/);
            shouldContainEntry(tree, `package.json`, /"build:server:prod": "webpack --config webpack.server.config.js --progress --colors"/);
            shouldContainEntry(tree, `package.json`, /"build:serverless": "npm run build:browser:serverless && npm run build:server:serverless"/);
            shouldContainEntry(tree, `package.json`, /"build:serverless:deploy": "npm run build:serverless && npm run deploy"/);
            shouldContainEntry(tree, `package.json`, /"build:server:serverless": "webpack --config webpack.server.config.js --progress --colors"/);
            done();
        });
    });

    // xdescribe('After Universal', () => {
    //     beforeEach((done) => {
    //         schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //             schematicRunner.runExternalSchematicAsync('@ng-toolkit/universal', 'ng-add', defaultOptions, tree).subscribe(tree => {
    //                 appTree = tree;
    //                 done();
    //             });
    //         });
    //     });

    //     describe('AWS Lambda', () => {
    //         beforeAll(() => defaultOptions['provider'] = 'aws');
    //         afterAll(() => delete defaultOptions['provider']);
    //         xit('Should create serverless configuration for AWS', (done) => {
    //             schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //                 checkIfFileExists(tree, `serverless.yml`);
    //                 checkIfFileExists(tree, `lambda.js`);
    //                 shouldContainEntry(tree, `serverless.yml`, /provider:[\s\S]*name:\saws/);
    //                 done();
    //             });
    //         });
    
    //         xit('Should add proper scripts to package.json', (done) => {
    //             schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //                 shouldContainEntry(tree, `package.json`, /"build:browser:serverless": "ng build --prod --base-href \/production\/"/);
    //                 done();
    //             });
    //         });
    //     });
    
    //     fdescribe('Firebase', () => {
    //         beforeAll(() => defaultOptions['provider'] = 'firebase');
    //         afterAll(() => delete defaultOptions['provider']);
    
    //         xit('Should create files', (done) => {
    //             schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //                 checkIfFileExists(tree, `functions/package.json`);
    //                 checkIfFileExists(tree, `functions/index.js`);
    //                 checkIfFileExists(tree, `.firebaserc`);
    //                 checkIfFileExists(tree, `firebase.json`);
    //                 done();
    //             });
    //         });
    
    //         xit('Should add proper scripts to package.json', (done) => {
    //             schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //                 shouldContainEntry(tree, `package.json`, /"build:browser:serverless": "ng build --prod --base-href \//);
    //                 done();
    //             });
    //         });
    //     });
    
    //     describe('Google Cloud Functions', () => {
    //         beforeAll(() => defaultOptions['provider'] = 'gcloud');
    //         afterAll(() => delete defaultOptions['provider']);
    //         xit('Should create serverless configuration and files', (done) => {
    //             schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //                 checkIfFileExists(tree, `serverless.yml`);
    //                 checkIfFileExists(tree, `index.js`);
    //                 shouldContainEntry(tree, `serverless.yml`, /provider:[\s\S]*name:\sgoogle/);
    //                 done();
    //             });
    //         });
    
    //         xit('Should add proper scripts to package.json', (done) => {
    //             schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //                 shouldContainEntry(tree, `package.json`, /"build:browser:serverless": "ng build --prod --base-href \/http\/"/);
    //                 done();
    //             });
    //         });
    //     });
    
    //     xit('By default AWS should be choosen as provider', (done) => {
    //         schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //             checkIfFileExists(tree, `serverless.yml`);
    //             checkIfFileExists(tree, `lambda.js`);
    //             shouldContainEntry(tree, `serverless.yml`, /provider:[\s\S]*name:\saws/);
    //             done();
    //         });
    //     });
    
    //     xit('Should create all common files', (done)=> {
    //         schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //             checkIfFileExists(tree, `local.js`);
    //             checkIfFileExists(tree, `server.ts`);
    //             checkIfFileExists(tree, `webpack.server.config.js`);
    //             checkIfFileExists(tree, `ng-toolkit.json`);
    //             checkIfFileExists(tree, `src/environments/environment.serverless.ts`);
    //             done();
    //         });
    //     });
    
    //     xit('Should add proper scripts to package.json', (done) => {
    //         schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //             shouldContainEntry(tree, `package.json`, /"build:browser:prod": "ng build --prod"/);
    //             shouldContainEntry(tree, `package.json`, /"build:prod": "npm run build:browser:prod && npm run build:server:prod"/);
    //             shouldContainEntry(tree, `package.json`, /"server": "node local.js"/);
    //             shouldContainEntry(tree, `package.json`, /"build:prod:deploy": "npm run build:prod && npm run deploy"/);
    //             shouldContainEntry(tree, `package.json`, /"build:server:prod": "ng run foo:server && webpack --config webpack.server.config.js --progress --colors"/);
    //             shouldContainEntry(tree, `package.json`, /"build:serverless": "npm run build:browser:serverless && npm run build:server:serverless"/);
    //             shouldContainEntry(tree, `package.json`, /"build:serverless:deploy": "npm run build:serverless && npm run deploy"/);
    //             shouldContainEntry(tree, `package.json`, /"build:server:serverless": "ng run foo:server:serverless && webpack --config webpack.server.config.js --progress --colors"/);
    //             done();
    //         });
    //     });
    // });
});