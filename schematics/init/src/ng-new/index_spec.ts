import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { checkIfFileExists } from '@ng-toolkit/_utils/testing';
// import { Tree } from '@angular-devkit/schematics';

const collectionPath = path.join(__dirname, '../collection.json');

describe('my-component', () => {
    const schematicRunner = new SchematicTestRunner('@ng-toolkit/init', collectionPath);
    const workspaceOptions = {
        name: 'workspace',
        version: '6.0.0',
        newProjectRoot: 'projects'
    };
    const defaultOptions = {
        name: 'foo',
        inlineStyle: false,
        inlineTemplate: false,
        routing: false,
        style: 'css',
        skipTests: false,
        skipPackageJson: false,
        version: '7.0.0'
    };
    let appTree: UnitTestTree;
    // let workspaceTree: Tree;
    beforeEach((done) => {
        appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'workspace', workspaceOptions);

        schematicRunner.runExternalSchematicAsync('@schematics/angular', 'application', { name: 'foo' }, appTree).subscribe(tree => {
            appTree = tree;
            done();
        });
        // workspaceTree = Tree.empty();
        // workspaceTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    });

    it('should create all files of an application', () => {
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
        });
    });
});