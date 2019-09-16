import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { checkIfFileExists } from '@ng-toolkit/_utils/testing';
import { getFileContent } from '../node_modules/@schematics/angular/utility/test';

const collectionPath = path.join(__dirname, '../collection.json');

describe('Firebug', () => {
    let appTree: UnitTestTree;

    const schematicRunner = new SchematicTestRunner('@ng-toolkit/firebug', collectionPath);
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

    it('Should create necessary files', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            checkIfFileExists(tree, '/projects/foo/src/environments/environment.firebug.ts');
            checkIfFileExists(tree, '/projects/foo/src/bootstrapScripts/firebug.ts');
            checkIfFileExists(tree, '/getFirebug.js');
            done();
        });
    });

    it('Should add firebug build to angular.json', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            const CLIConfig = JSON.parse(getFileContent(tree, 'angular.json'));

            const fireBugConfiguration = CLIConfig.projects[defaultOptions.project].architect.build.configurations.firebug;
            expect(fireBugConfiguration).toBeDefined('Lack of firebug configuration in angular.json');
            expect(fireBugConfiguration.fileReplacements).toBeDefined('Lack of file replacement in firebug configuration');

            let replacements = JSON.stringify([
                {
                    "replace": "src/environments/environment.ts",
                    "with": "src/environments/environment.firebug.ts"
                }
            ]);
            expect(JSON.stringify(fireBugConfiguration.fileReplacements)).toEqual(replacements, 'Replacements are not as expected');
            done();
        });
    });

    it('Should add proper configration to serve in angular.json', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            const CLIConfig = JSON.parse(getFileContent(tree, `angular.json`));

            const fireBugConfiguration = CLIConfig.projects[defaultOptions.project].architect.serve.configurations.firebug;
            expect(fireBugConfiguration).toBeDefined('Lack of firebug serve configuration in angular.json');

            expect(JSON.stringify(fireBugConfiguration)).toEqual(JSON.stringify({ "browserTarget": `${defaultOptions.project}:build:firebug` }));
            done();
        });
    });

    it('Should add scripts to package.json', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            const packageJson = JSON.parse(getFileContent(tree, 'package.json'));
            expect(packageJson.scripts['build:firebug']).toEqual('node getFirebug.js && ng serve -c firebug');
            done();
        });
    });

    it('Should contain necessary dependencies', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            const packageJson = JSON.parse(getFileContent(tree, 'package.json'));
            expect(packageJson.devDependencies['node-wget']).toBeDefined('Lack of node-wget in dependencies');
            expect(packageJson.devDependencies['decompress']).toBeDefined('Lack of decompress in dependencies');
            expect(packageJson.devDependencies['decompress-targz']).toBeDefined('Lack of decompress-targz in dependencies');
            done();
        });
    });

    it('Should contain firebug script in bootstrap file', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            const bootstrapFile = getFileContent(tree, '/projects/foo/src/main.ts');
            expect(bootstrapFile.indexOf('fireBug')).toBeGreaterThan(-1, 'Lack of firebug script in bootstrap');
            done();
        });
    });


    it('Should contain firebug in assets', (done) => {
        schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree).subscribe(tree => {
            const CLIConfig = JSON.parse(getFileContent(tree, 'angular.json'));

            const assets = CLIConfig.projects[defaultOptions.project].architect.build.options.assets;
            expect(JSON.stringify(assets[2])).toEqual(JSON.stringify({
                "glob": "**/*.*",
                "input": "firebug-lite",
                "output": "/firebug-lite"
            }));
            done();
        });

    });
});