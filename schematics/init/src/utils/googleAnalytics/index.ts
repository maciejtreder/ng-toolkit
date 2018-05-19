import { apply, chain, mergeWith, move, Rule, url } from '@angular-devkit/schematics';
import { getFileContent } from '@schematics/angular/utility/test';
import { addEntryToEnvironment, addImportStatement, createOrOverwriteFile } from '@ng-toolkit/_utils';
import { Path } from '@angular-devkit/core';

export function addGoogleAnalytics(options: any): Rule {

    const source = apply(url('../utils/googleAnalytics/files'), [
        move(`${options.directory}/src/bootstrapScripts`)
    ]);

    return chain([
        mergeWith(source),
        tree => {
            let indexContent = '';
            if (tree.exists(`${options.directory}/src/bootstrapScripts/index.ts`)) {
                indexContent = getFileContent(tree, `${options.directory}/src/bootstrapScripts/index.ts`);
            }
            createOrOverwriteFile(tree,`${options.directory}/src/bootstrapScripts/index.ts`, indexContent + 'export * from \'./googleAnalytics\';\n');

            //find and overwrite environment files

            tree.getDir(`${options.directory}/src/environments`).visit( (path: Path) => {
                if (path.endsWith('.ts')) {
                    addEntryToEnvironment(tree, path, 'gaTrackingCode', options.gaTrackingCode);
                    addEntryToEnvironment(tree, path, 'googleAnalytics', path.indexOf('prod') > -1);
                }
            });

            //find and add code to the main browser file
            let mainFilePath;
            if (tree.exists(`${options.directory}/angular.json`)) {
                const cliConfig = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
                mainFilePath = `${options.directory}/` + cliConfig.projects[options.name].architect.build.options.main;

            } else {
                const configSource = JSON.parse(getFileContent(tree, `${options.directory}/.angular-cli.json`));
                mainFilePath = `${options.directory}/${configSource.apps[0].root}/main.browser.ts`;
            }

            addImportStatement(tree, mainFilePath, 'googleAnalytics', './bootstrapScripts')

            // adding script at the end of file

            const sourceText = getFileContent(tree, mainFilePath);
            const changeRecorder = tree.beginUpdate(mainFilePath);

            changeRecorder.insertRight(sourceText.length, 'googleAnalytics();\n');
            tree.commitUpdate(changeRecorder);

            return tree;
        }
    ]);
}