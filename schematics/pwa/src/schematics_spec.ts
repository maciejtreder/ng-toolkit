import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { checkIfFileExists } from '@ng-toolkit/_utils/testing';
import { Tree } from '@angular-devkit/schematics';

const collectionPath = path.join(__dirname, './collection.json');

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

    xit('Should create files', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, `${defaultOptions.directory}/local.js`);
            checkIfFileExists(tree, `${defaultOptions.directory}/server.ts`);
            checkIfFileExists(tree, `${defaultOptions.directory}/src/app/app.browser.module.ts`);
            checkIfFileExists(tree, `${defaultOptions.directory}/src/app/app.server.module.ts`);
            checkIfFileExists(tree, `${defaultOptions.directory}/src/main.server.ts`);
            checkIfFileExists(tree, `${defaultOptions.directory}/src/tsconfig.server.json`);
            checkIfFileExists(tree, `${defaultOptions.directory}/webpack.server.config.js`);
            checkIfFileExists(tree, `${defaultOptions.directory}/ng-toolkit.json`);
            done();
        });

    });

    it('do nothing', () => {
        console.log('nothing');
    });

    // it('Should throw exception if @angular/pwa not runned', (done) => {
    //     schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //         const cliConfig = JSON.parse(getFileContent(tree, `${defaultOptions.directory}/angular.json`));
    //         console.log(cliConfig);
    //         done();
    //     });
    // })
});