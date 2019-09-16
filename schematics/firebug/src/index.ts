import { Rule, chain, mergeWith, MergeStrategy, apply, url, move, Tree, SchematicContext } from '@angular-devkit/schematics';
import { applyAndLog, createOrOverwriteFile, addOrReplaceScriptInPackageJson, addEntryToEnvironment, updateBoostrapFirebug, addDependencyToPackageJson } from '@ng-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Path } from '../node_modules/@angular-devkit/core';
import { getWorkspace } from '@schematics/angular/utility/config';
import { NodeDependencyType } from '@schematics/angular/utility/dependencies';
import { IFirebugSchema } from './schema';
import * as bugsnag from 'bugsnag';

export default function addFirebug(options: IFirebugSchema): Rule {
    if (!options.clientProject) {
        options.clientProject = options.project;
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
        move(options.directory)
    ]);

    const rules: Rule[] = [];
    // adding build script and dependencies
    rules.push(addOrReplaceScriptInPackageJson(options, 'build:firebug', `node getFirebug.js && ng serve -c firebug`));
    rules.push(updateCLIConfig(options));
    rules.push(updatePackageDependencies(options));
    rules.push(updateConfigFiles(options));

    rules.push(mergeWith(templateSource, MergeStrategy.Overwrite));
    rules.push((tree: Tree) => {
        tree.rename(`/src/bootstrapScripts/firebug.ts`, `${getSourceRoot(tree, options)}/bootstrapScripts/firebug.ts`);
        tree.rename(`/src/environments/environment.firebug.ts`, `${getSourceRoot(tree, options)}/environments/environment.firebug.ts`);
        return tree;
    });

    if (!options.disableBugsnag) {
        return applyAndLog(chain(rules));
    } else {
        return chain(rules);
    }
}

function getSourceRoot(tree: Tree, options: IFirebugSchema): string {
    const workspace = getWorkspace(tree);
    return `/${workspace.projects[options.clientProject].sourceRoot}`;
}

function updateCLIConfig(options: IFirebugSchema): Rule {
    return (tree: Tree) => {
        const CLIConfig = JSON.parse(getFileContent(tree, `angular.json`));
        CLIConfig.projects[options.clientProject].architect.build.configurations.firebug = {
            fileReplacements: [
                {
                    "replace": "src/environments/environment.ts",
                    "with": "src/environments/environment.firebug.ts"
                }
            ]
        };

        CLIConfig.projects[options.clientProject].architect.serve.configurations.firebug = { "browserTarget": `${options.clientProject}:build:firebug` };

        CLIConfig.projects[options.clientProject].architect.build.options.assets.push({
            "glob": "**/*.*",
            "input": "firebug-lite",
            "output": "/firebug-lite"
        });
        createOrOverwriteFile(tree, `angular.json`, JSON.stringify(CLIConfig, null, 4));
        return tree;
    }
}

function updateConfigFiles(options: IFirebugSchema): Rule {
    return (tree: Tree, context: SchematicContext) => {
        // update configuration files
        tree.getDir(`${getSourceRoot(tree, options)}/environments`).visit((path: Path) => {
            if (path.endsWith('.ts')) {
                addEntryToEnvironment(tree, path, 'firebug', false);
            }
        });

        //update bootstrap
        updateBoostrapFirebug(tree, options);

        if (!options.skipInstall) {
            context.addTask(new NodePackageInstallTask());
        }
        return tree;
    }
}

function updatePackageDependencies(options: IFirebugSchema): Rule {
    return (tree: Tree) => {
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: 'node-wget',
            version: '^0.4.2'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: 'decompress',
            version: '^4.2.0'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: 'decompress-targz',
            version: '^4.1.1'
        });
        return tree;
    }
}