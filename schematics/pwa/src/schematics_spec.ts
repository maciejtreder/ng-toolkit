import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { checkIfFileExists } from '@ng-toolkit/_utils/testing';
// import { Tree } from '@angular-devkit/schematics';

const collectionPath = path.join(__dirname, './collection.json');

describe('Serverless', () => {
    let appTree: UnitTestTree;

    const schematicRunner = new SchematicTestRunner('@ng-toolkit/serverless', collectionPath);

    const defaultOptions: any = {
        clientProject: 'foo',
        disableBugsnag: true
    };

    beforeEach((done) => {
        appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'workspace', {
            name: 'workspace',
            version: '6.0.0',
            newProjectRoot: 'projects'
        });

        schematicRunner.runExternalSchematic('@schematics/angular', 'application', {name: 'foo'}, appTree);
        schematicRunner.runExternalSchematicAsync('@ng-toolkit/universal', 'ng-add', defaultOptions, appTree).subscribe(tree => {
            appTree = tree;
            done();
        });
    });

    xit('Should create files', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, `/local.js`);
            checkIfFileExists(tree, `/server.ts`);
            checkIfFileExists(tree, `/projects/foo/src/app/app.browser.module.ts`);
            checkIfFileExists(tree, `/projects/foo/src/app/app.server.module.ts`);
            checkIfFileExists(tree, `/projects/foo/src/main.server.ts`);
            checkIfFileExists(tree, `/projects/foo/src/tsconfig.server.json`);
            checkIfFileExists(tree, `/projects/foo/webpack.server.config.js`);
            checkIfFileExists(tree, `/ng-toolkit.json`);
            done();
        });
    });

    // it('Should throw exception if @angular/pwa not runned', (done) => {
    //     schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //         const cliConfig = JSON.parse(getFileContent(tree, `${defaultOptions.directory}/angular.json`));
    //         console.log(cliConfig);
    //         done();
    //     });
    // });
});