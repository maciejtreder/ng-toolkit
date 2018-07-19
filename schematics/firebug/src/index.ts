import * as bugsnag from 'bugsnag';
import { Rule, chain, mergeWith, MergeStrategy, apply, url, move, Tree, SchematicContext } from '@angular-devkit/schematics';
import { applyAndLog, updateProject, createOrOverwriteFile, addOrReplaceScriptInPackageJson2, addDependencyToPackageJson, addEntryToEnvironment, getMainFilePath, addImportLine } from '@ng-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Path } from '../node_modules/@angular-devkit/core';
import * as ts from 'typescript';

export default function addServerless(options: any): Rule {

    bugsnag.register('0b326fddc255310e516875c9874fed91');
    bugsnag.onBeforeNotify((notification) => {
        let metaData = notification.events[0].metaData;
        metaData.subsystem = {
            package: 'firebug',
            options: options
        };
    });

    const templateSource = apply(url('files'), [
        move(options.directory)
    ]);

    let rule: Rule = chain([
        (tree: Tree, context: SchematicContext) => {
            // update project name
            updateProject(tree, options);

            // updating CLI config
            const CLIConfig = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
            CLIConfig.projects[options.project].architect.build.configurations.firebug = {
                fileReplacements: [
                    {
                      "replace": "src/environments/environment.ts",
                      "with": "src/environments/environment.firebug.ts"
                    }
                  ]
            }

            CLIConfig.projects[options.project].architect.serve.configurations.firebug = { "browserTarget": `${options.project}:build:firebug` };

            CLIConfig.projects[options.project].architect.build.options.assets.push({
                "glob": "**/*.*",
                "input": "firebug-lite",
                "output": "/firebug-lite"
              });

            createOrOverwriteFile(tree,  `${options.directory}/angular.json`, JSON.stringify(CLIConfig, null, "  "));


            // adding build script and dependencies
            addOrReplaceScriptInPackageJson2(tree, options, "build:firebug", `node getFirebug.js && ng serve -c firebug`);
            addDependencyToPackageJson(tree, options, 'node-wget', '^0.4.2', true);
            addDependencyToPackageJson(tree, options, 'decompress', '^4.2.0', true);
            addDependencyToPackageJson(tree, options, 'decompress-targz', '^4.1.1', true);

            // update configuration files
            tree.getDir(`${options.directory}/src/environments`).visit( (path: Path) => {
                if (path.endsWith('.ts')) {
                    addEntryToEnvironment(tree, path, 'firebug', false);
                }
            });

            //update bootstrap
            
            let mainFilePath = `${options.directory}/${getMainFilePath(tree, options)}`;
            let mainFileContent = getFileContent(tree, mainFilePath);
            let sourceFile: ts.SourceFile = ts.createSourceFile('temp.ts', mainFileContent, ts.ScriptTarget.Latest);

            sourceFile.forEachChild(node => {
                if (ts.isExpressionStatement(node)) {
                    let expression = mainFileContent.substring(node.pos, node.end);
                    if (expression.indexOf('bootstrapModule') > -1) {
                        //should be wrapped!
                        mainFileContent = mainFileContent.substr(0, node.pos) + `\nfireBug().then(() => { \n ${expression} \n});` + mainFileContent.substr(node.end);
                        createOrOverwriteFile(tree, mainFilePath, mainFileContent);
                        addImportLine(tree, mainFilePath, `import { fireBug } from './bootstrapScripts/firebug';`);
                    }
                }
            });

            if (!options.skipInstall) {
                context.addTask(new NodePackageInstallTask(options.directory));
            }
        },

        mergeWith(templateSource, MergeStrategy.Overwrite),
    ]);

    if (!options.disableBugsnag) {
        return applyAndLog(rule);
    } else {
        return rule;
    }

}
