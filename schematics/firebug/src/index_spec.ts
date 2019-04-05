import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { checkIfFileExists } from '@ng-toolkit/_utils/testing';
// import { Tree } from '@angular-devkit/schematics';
import { getFileContent } from '../node_modules/@schematics/angular/utility/test';

const collectionPath = path.join(__dirname, '../collection.json');

describe('Firebug', () => {
    let appTree: UnitTestTree;

    const schematicRunner = new SchematicTestRunner('@ng-toolkit/serverless', collectionPath);

    const defaultOptions: any = {
        project: 'foo',
        disableBugsnag: true,
        clientProject: 'foo'
    };

    beforeEach(() => {
        appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'workspace', {
            name: 'workspace',
            version: '6.0.0',
            newProjectRoot: 'projects'
        });

        schematicRunner.runExternalSchematic('@schematics/angular', 'application', {name: 'foo'}, appTree);

        schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    });

    it('Should create necessary files', () => {
        checkIfFileExists(appTree, `/projects/foo/src/environments/environment.firebug.ts`);
        checkIfFileExists(appTree, `/projects/foo/src/bootstrapScripts/firebug.ts`);
        checkIfFileExists(appTree, `/getFirebug.js`);
    });

    it('Should add firebug build to angular.json', () => {
        const CLIConfig = JSON.parse(getFileContent(appTree, `angular.json`));

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
    });

    it('Should add proper configration to serve in angular.json', () => {
        const CLIConfig = JSON.parse(getFileContent(appTree, `angular.json`));

        const fireBugConfiguration = CLIConfig.projects[defaultOptions.project].architect.serve.configurations.firebug;
        expect(fireBugConfiguration).toBeDefined('Lack of firebug serve configuration in angular.json');

        expect(JSON.stringify(fireBugConfiguration)).toEqual(JSON.stringify({ "browserTarget": `${defaultOptions.project}:build:firebug` }));
    });

    it ('Should add scripts to package.json', () => {
        const packageJson = JSON.parse(getFileContent(appTree, `package.json`));
        expect(packageJson.scripts['build:firebug']).toEqual('node getFirebug.js && ng serve -c firebug');
    });

    it('Should contain necessary dependencies', () => {
        const packageJson = JSON.parse(getFileContent(appTree, `package.json`));
        expect(packageJson.devDependencies['node-wget']).toBeDefined('Lack of node-wget in dependencies');
        expect(packageJson.devDependencies['decompress']).toBeDefined('Lack of decompress in dependencies');
        expect(packageJson.devDependencies['decompress-targz']).toBeDefined('Lack of decompress-targz in dependencies');
    });

    it('Should contain firebug script in bootstrap file', () => {
        const bootstrapFile = getFileContent(appTree, `/projects/foo/src/main.ts`);
        expect(bootstrapFile.indexOf('fireBug')).toBeGreaterThan(-1, 'Lack of firebug script in bootstrap');
    });


    it('Should contain firebug in assets', () => {
        const CLIConfig = JSON.parse(getFileContent(appTree, `angular.json`));

        const assets = CLIConfig.projects[defaultOptions.project].architect.build.options.assets;
        expect(JSON.stringify(assets[2])).toEqual(JSON.stringify({
            "glob": "**/*.*",
            "input": "firebug-lite",
            "output": "/firebug-lite"
          }));
    });
});