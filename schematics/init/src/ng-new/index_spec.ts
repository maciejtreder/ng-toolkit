import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { checkIfFileExists, shouldContainEntry } from '@ng-toolkit/_utils/testing';

const collectionPath = path.join(__dirname, '../collection.json');

describe('My Schematic', () => {
    const schematicRunner = new SchematicTestRunner('@ng-toolkit/init', collectionPath);

    const workspaceOptions = {
        name: 'workspace',
        version: '6.0.0',
        newProjectRoot: 'projects'
    };
    const defaultOptions: any = {
        name: 'foo',
        inlineStyle: false,
        inlineTemplate: false,
        routing: false,
        style: 'css',
        skipTests: false,
        skipPackageJson: false,
        version: '7.0.0',
        provider: 'aws',
        disableBugsnag: true
    };
    let appTree: UnitTestTree;

    beforeEach((done) => {
        appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'workspace', workspaceOptions);

        schematicRunner.runExternalSchematicAsync('@schematics/angular', 'application', { name: 'foo' }, appTree).subscribe(tree => {
            appTree = tree;
            done();
        });
    });

    it('should create all files of an application', (done) => {
        schematicRunner.runSchematicAsync('ng-new', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, '/foo/tsconfig.json');
            checkIfFileExists(tree, '/foo/tslint.json');
            checkIfFileExists(tree, '/foo/angular.json');
            checkIfFileExists(tree, '/foo/credentials.js');
            checkIfFileExists(tree, '/foo/LICENSE');
            checkIfFileExists(tree, '/foo/local.js');
            checkIfFileExists(tree, '/foo/ngsw-config.json');
            checkIfFileExists(tree, '/foo/README.md');
            checkIfFileExists(tree, '/foo/src/environments/environment.ts');
            checkIfFileExists(tree, '/foo/src/environments/environment.prod.ts');
            checkIfFileExists(tree, '/foo/src/favicon.ico');
            checkIfFileExists(tree, '/foo/src/index.html');
            checkIfFileExists(tree, '/foo/src/main.browser.ts');
            checkIfFileExists(tree, '/foo/src/manifest.json');
            checkIfFileExists(tree, '/foo/src/main.server.ts');
            checkIfFileExists(tree, '/foo/src/polyfills.ts');
            checkIfFileExists(tree, '/foo/src/styles.css');
            checkIfFileExists(tree, '/foo/src/test.ts');
            checkIfFileExists(tree, '/foo/src/tsconfig.app.json');
            checkIfFileExists(tree, '/foo/src/tsconfig.server.json');
            checkIfFileExists(tree, '/foo/src/tsconfig.spec.json');
            checkIfFileExists(tree, '/foo/src/app/app.module.ts');
            checkIfFileExists(tree, '/foo/src/app/app.component.css');
            checkIfFileExists(tree, '/foo/src/app/app.component.html');
            checkIfFileExists(tree, '/foo/src/app/app.component.spec.ts');
            checkIfFileExists(tree, '/foo/src/app/app.component.ts');
            done();
        });
    });

    it('Should create serverless configuration for AWS', (done) => {
        schematicRunner.runSchematicAsync('ng-new', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, '/foo/serverless.yml');
            checkIfFileExists(tree, '/foo/lambda.js');
            shouldContainEntry(tree, '/foo/serverless.yml', /provider:[\s\S]*name:\saws/);
            done();
        })
    });

    it('Should create all common files', (done)=> {
        schematicRunner.runSchematicAsync('ng-new', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, '/foo/local.js');
            checkIfFileExists(tree, '/foo/server.ts');
            checkIfFileExists(tree, '/foo/webpack.server.config.js');
            checkIfFileExists(tree, '/foo/ng-toolkit.json');
            done();
        });
    });

    it('Should add proper scripts to package.json', (done) => {
        schematicRunner.runSchematicAsync('ng-new', defaultOptions, appTree).subscribe(tree => {
            shouldContainEntry(tree, '/foo/package.json', /"build:browser:serverless": "ng build --prod --base-href \/production\/"/);
            done();
        });
    });
});