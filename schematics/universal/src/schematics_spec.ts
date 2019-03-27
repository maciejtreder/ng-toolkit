import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

const collectionPath = path.join(__dirname, './collection.json');

describe('Universal', () => {
    let appTree: UnitTestTree;

    const schematicRunner = new SchematicTestRunner('schematics', collectionPath);

    const defaultOptions: any = {
        clientProject: 'foo',
        disableBugsnag: true
    };

    beforeEach(() => {
        appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'workspace', {
            name: 'workspace',
            version: '6.0.0',
            newProjectRoot: 'projects'
        });

        schematicRunner.runExternalSchematic('@schematics/angular', 'application', {name: 'foo'}, appTree);
    });

    // xit('Should create files', (done) => {
    //     schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //         checkIfFileExists(tree, `${defaultOptions.appDir}/local.js`);
    //         checkIfFileExists(tree, `${defaultOptions.appDir}/server.ts`);
    //         checkIfFileExists(tree, `${defaultOptions.appDir}/src/app/app.browser.module.ts`);
    //         checkIfFileExists(tree, `${defaultOptions.appDir}/src/app/app.server.module.ts`);
    //         checkIfFileExists(tree, `${defaultOptions.appDir}/src/main.server.ts`);
    //         checkIfFileExists(tree, `${defaultOptions.appDir}/src/tsconfig.server.json`);
    //         checkIfFileExists(tree, `${defaultOptions.appDir}/webpack.server.config.js`);
    //         checkIfFileExists(tree, `${defaultOptions.appDir}/ng-toolkit.json`);
    //         done();
    //     });
    // });

    // xit('Should create scripts', (done) => {
    //     schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
    //         // shouldContainEntry(tree, `${defaultOptions.appDir}/package.json`, /"build:server:prod": "ng run foo:server && webpack --config webpack.server.config.js --progress --colors"/);
    //         // shouldContainEntry(tree, `${defaultOptions.appDir}/package.json`, /"build:browser:prod": "ng build --prod"/);
    //         shouldContainEntry(tree, `${defaultOptions.appDir}/package.json`, /"build:prod": "npm run build:server:prod && npm run build:browser:prod"/);
    //         done();
    //     });
    // });

    it('dummy', () => {
        schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
        // schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(() => {
        //     done();
        // });
    });

//    xit('Should add server build', (done) => {
//         schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
//             const cliConfig = JSON.parse(getFileContent(tree, `${defaultOptions.appDir}/angular.json`));
//             expect(cliConfig.projects.foo.architect.server).toBeDefined(`Can't find server build`);
//             done();
//         });
//     })
});