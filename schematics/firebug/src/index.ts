import * as bugsnag from 'bugsnag';
import { Rule, chain, mergeWith, MergeStrategy, apply, url, move, Tree, SchematicContext } from '@angular-devkit/schematics';
import { applyAndLog, createOrOverwriteFile, addOrReplaceScriptInPackageJson2, addEntryToEnvironment, getMainFilePath, addImportLine } from '@ng-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Path } from '../node_modules/@angular-devkit/core';
import * as ts from 'typescript';
import { getWorkspace } from '@schematics/angular/utility/config';
import {
  addPackageJsonDependency,
  NodeDependencyType,
} from '@schematics/angular/utility/dependencies';

export default function addFirebug(options: any): Rule {

    function getSourceRoot(tree: Tree): string {
        const workspace = getWorkspace(tree);
        return `/${workspace.projects[options.clientProject].sourceRoot}`;
    }

    bugsnag.register('0b326fddc255310e516875c9874fed91');
    bugsnag.onBeforeNotify((notification) => {
        let metaData = notification.events[0].metaData;
        metaData.subsystem = {
            package: 'firebug',
            options: options
        };
    });

    const templateSource = apply(url('files'), [
        move('/')
    ]);

    let rule: Rule = chain([
        (tree: Tree, context: SchematicContext) => {

            // updating CLI config
            const CLIConfig = JSON.parse(getFileContent(tree, `angular.json`));
            CLIConfig.projects[options.clientProject].architect.build.configurations.firebug = {
                fileReplacements: [
                    {
                      "replace": "src/environments/environment.ts",
                      "with": "src/environments/environment.firebug.ts"
                    }
                  ]
            }

            CLIConfig.projects[options.clientProject].architect.serve.configurations.firebug = { "browserTarget": `${options.clientProject}:build:firebug` };

            CLIConfig.projects[options.clientProject].architect.build.options.assets.push({
                "glob": "**/*.*",
                "input": "firebug-lite",
                "output": "/firebug-lite"
              });

            createOrOverwriteFile(tree,  `angular.json`, JSON.stringify(CLIConfig, null, "  "));


            // adding build script and dependencies
            addOrReplaceScriptInPackageJson2(tree, "build:firebug", `node getFirebug.js && ng serve -c firebug`);

            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'node-wget',
                version: '^0.4.2'
              });
              addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'decompress',
                version: '^4.2.0'
              });
              addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'decompress-targz',
                version: '^4.1.1'
              });


            // update configuration files
            tree.getDir(`${getSourceRoot(tree)}/environments`).visit( (path: Path) => {
                if (path.endsWith('.ts')) {
                    addEntryToEnvironment(tree, path, 'firebug', false);
                }
            });

            //update bootstrap
            
            let mainFilePath = `${getMainFilePath(tree, options)}`;
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
                context.addTask(new NodePackageInstallTask());
            }
        },

        mergeWith(templateSource, MergeStrategy.Overwrite),
        tree => {
            tree.rename(`/src/bootstrapScripts/firebug.ts`, `${getSourceRoot(tree)}/bootstrapScripts/firebug.ts`);
            tree.rename(`/src/environments/environment.firebug.ts`, `${getSourceRoot(tree)}/environments/environment.firebug.ts`);
            return tree;
        }
    ]);

    if (!options.disableBugsnag) {
        return applyAndLog(rule);
    } else {
        return rule;
    }

}
