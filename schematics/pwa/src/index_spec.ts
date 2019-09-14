import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { checkIfFileExists } from '@ng-toolkit/_utils/testing';
// import { getFileContent } from '@schematics/angular/utility/test';

const collectionPath = path.join(__dirname, '../collection.json');

describe('PWA', () => {
    let appTree: UnitTestTree;

    const schematicRunner = new SchematicTestRunner('@ng-toolkit/pwa', collectionPath);

    const workspaceOptions = {
        name: 'workspace',
        version: '6.0.0',
        newProjectRoot: 'projects'
    };
    const defaultOptions: any = {
        clientProject: 'foo',
        disableBugsnag: true
    };

    beforeEach((done) => {
        appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'workspace', workspaceOptions);

        schematicRunner.runExternalSchematicAsync('@schematics/angular', 'application', { name: 'foo' }, appTree).subscribe(tree => {
            appTree = tree;
            schematicRunner.runExternalSchematicAsync('@angular/pwa', 'ng-add', { project: 'foo' }, appTree).subscribe(tree => {
                appTree = tree;
                schematicRunner.runExternalSchematicAsync('@ng-toolkit/universal', 'ng-add', defaultOptions, appTree).subscribe(tree => {
                    appTree = tree;
                    done();
                });
            });
        });
    });

    it('Should create files', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, `/local.js`);
            checkIfFileExists(tree, `/server.ts`);
            checkIfFileExists(tree, `/ng-toolkit.json`);
            checkIfFileExists(tree, `/webpack.server.config.js`);
            checkIfFileExists(tree, `/projects/foo/tsconfig.server.json`);
            checkIfFileExists(tree, `/projects/foo/src/main.server.ts`);
            checkIfFileExists(tree, `/projects/foo/src/app/app.browser.module.ts`);
            checkIfFileExists(tree, `/projects/foo/src/app/app.server.module.ts`);
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