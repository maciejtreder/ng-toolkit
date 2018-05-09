import { move, Rule, url, chain, mergeWith, apply } from '@angular-devkit/schematics';
import {
    addDependencyToPackageJson, addEntryToEnvironment, addImportStatement,
    createOrOverwriteFile
} from '../index';
import { getFileContent } from '@schematics/angular/utility/test';
import { Path } from '@angular-devkit/core';

export function addFireBug(options: any): Rule {

    const source = apply(url('../utils/firebug/files'), [
        move(`${options.directory}/src/bootstrapScripts`)
    ]);

    return chain([
        mergeWith(source),
        addDependencyToPackageJson(options, 'node-wget', '^0.4.2', true),
        addDependencyToPackageJson(options, 'decompress', '^4.2.0', true),
        addDependencyToPackageJson(options, 'decompress-targz', '^4.1.1', true),
        tree => {
            let indexContent = '';
            if (tree.exists(`${options.directory}/src/bootstrapScripts/index.ts`)) {
                indexContent = getFileContent(tree, `${options.directory}/src/bootstrapScripts/index.ts`);
            }
            createOrOverwriteFile(tree,`${options.directory}/src/bootstrapScripts/index.ts`, indexContent + 'export * from \'./firebug\';\n');

            //find and overwrite environment files

            createOrOverwriteFile(tree, `${options.directory}/src/environments/environment.firebug.ts`, getFileContent(tree, `${options.directory}/src/environments/environment.ts`));

            tree.getDir(`${options.directory}/src/environments`).visit( (path: Path) => {
                if (path.endsWith('.ts')) {
                    addEntryToEnvironment(tree, path, 'firebug', path.indexOf('firebug') > -1);
                }
            });

            let mainFilePath;
            //add new configuration to serve
            if (tree.exists(`${options.directory}/angular.json`)) {
                const cliConfig = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
                mainFilePath = `${options.directory}/` + cliConfig.projects[options.name].architect.build.options.main;

                cliConfig.projects[options.name].architect.serve.configurations.firebug = {browserTarget: `${options.name}:build:firebug`};

                createOrOverwriteFile(tree, `${options.directory}/angular.json`, JSON.stringify(cliConfig, null, '  '));

            } else {
                const configSource = JSON.parse(getFileContent(tree, `${options.directory}/.angular-cli.json`));
                mainFilePath = `${options.directory}/${configSource.apps[0].root}/main.browser.ts`;
            }
            //find and add code to the main browser file

            addImportStatement(tree, mainFilePath, 'import { fireBug } from \'./bootstrapScripts\';')
            const sourceText = getFileContent(tree, mainFilePath);

            createOrOverwriteFile(tree, mainFilePath, sourceText.replace('platformBrowserDynamic().bootstrapModule(AppBrowserModule);', 'fireBug().then(() => platformBrowserDynamic().bootstrapModule(AppBrowserModule));'));

            //adding postinstal script
            let postInstall = '';
            if (tree.exists(`${options.directory}/postinstall.js`)) {
                postInstall = getFileContent(tree, `${options.directory}/postinstall.js`);
            }
            postInstall = `
const fs = require('fs');
const wget = require('node-wget');
const decompress = require('decompress');
const decompressTargz = require('decompress-targz');

if (!fs.existsSync('./firebug-lite.tar.tgz')) {
  console.log('Downloading firebug.');
  wget({url: 'https://getfirebug.com/releases/lite/latest/firebug-lite.tar.tgz', dest: './'}, () => {
    console.log('Downloaded.');
    decompress('firebug-lite.tar.tgz', '.', {
      plugins: [
        decompressTargz()
      ]
    }).then(() => console.log('Decompressed.'));
  });
}` + postInstall;

            createOrOverwriteFile(tree, `${options.directory}/postinstall.js`, postInstall);

            return tree;
        }
    ]);
}