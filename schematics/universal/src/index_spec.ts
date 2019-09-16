import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { shouldContainEntry, checkIfFileExists } from '@ng-toolkit/_utils/testing';
import { getFileContent } from '@schematics/angular/utility/test';

const collectionPath = path.join(__dirname, '../collection.json');

describe('Universal', () => {
    let appTree: UnitTestTree;

    const schematicRunner = new SchematicTestRunner('@ng-toolkit/universal', collectionPath);

    const workspaceOptions = {
        name: 'workspace',
        version: '6.0.0',
        newProjectRoot: 'projects'
    };
    const defaultOptions: any = {
        project: 'foo',
        disableBugsnag: true
    };

    beforeEach((done) => {
        appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'workspace', workspaceOptions);

        schematicRunner.runExternalSchematicAsync('@schematics/angular', 'application', { name: 'foo' }, appTree).subscribe(tree => {
            appTree = tree;
            done();
        });
    });

    it('Should create files', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, '/local.js');
            checkIfFileExists(tree, '/server.ts');
            checkIfFileExists(tree, '/projects/foo/src/app/app.browser.module.ts');
            checkIfFileExists(tree, '/projects/foo/src/app/app.server.module.ts');
            checkIfFileExists(tree, '/projects/foo/src/main.server.ts');
            checkIfFileExists(tree, '/webpack.server.config.js');
            checkIfFileExists(tree, '/ng-toolkit.json');
            done();
        });
    });

    it('Should create scripts', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            shouldContainEntry(tree, '/package.json', /"build:prod": "npm run build:ssr"/);
            done();
        });
    });

    it('Should add server build', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            const cliConfig = JSON.parse(getFileContent(tree, '/angular.json'));
            expect(cliConfig.projects.foo.architect.server).toBeDefined(`Can't find server build`);
            done();
        });
    });
});