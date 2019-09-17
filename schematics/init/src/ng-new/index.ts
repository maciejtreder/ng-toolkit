import { Rule, chain, Tree, move, apply, url, mergeWith, MergeStrategy, externalSchematic } from '@angular-devkit/schematics';
import { createOrOverwriteFile, addOrReplaceScriptInPackageJson, applyAndLog, addDependencyToPackageJson } from '@ng-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { NodeDependencyType } from '@schematics/angular/utility/dependencies';
import { Schema } from './schema';
import { newApp } from '../utils/new-app/index';
import { WorkspaceSchema, WorkspaceTargets, Builders } from '@schematics/angular/utility/workspace-models';
import bugsnag, { Bugsnag } from '@bugsnag/js';

const bugsnagClient: Bugsnag.Client = bugsnag('0b326fddc255310e516875c9874fed91');

export default function (options: Schema): Rule {
    if (!options.directory) {
        options.directory = options.name;
    }

    // Register bugsnag in order to catch and notify any rule error.
    bugsnagClient.config.beforeSend = (report: Bugsnag.Report) => {
        report.metaData = {
            subsystem: {
                package: 'ng-new',
                options: options
            }
        }
    }

    // clientProject is not a property of angular schematic schema.
    const { clientProject, ...angularOptions } = options;
    const templateSource = apply(url('./files'), [
        move(options.directory),
    ]);
    const rule: Rule = chain([
        externalSchematic('@schematics/angular', 'ng-new', angularOptions),
        adjustCLIConfig(options),
        newApp(options),
        mergeWith(templateSource, MergeStrategy.Overwrite),
        updatePackageJson(options)
    ]);
    return applyAndLog(rule, bugsnagClient);
}

function updatePackageJson(options: Schema): Rule {
    const rules: Rule[] = [];
    rules.push(
        addOrReplaceScriptInPackageJson(options, 'build:client-and-server-bundles', 'ng build --prod && ng run __projectName__:server'),
        addOrReplaceScriptInPackageJson(options, 'build:prod', 'npm run build:client-and-server-bundles && npm run webpack:server'),
        addOrReplaceScriptInPackageJson(options, 'test', 'ng test --code-coverage'),
        addOrReplaceScriptInPackageJson(options, 'test:watch', 'ng test --watch --code-coverage'),
    );
    rules.push((tree: Tree) => {
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: '@angular/service-worker',
            version: '^6.0.0'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: '@angular/platform-server',
            version: '^6.0.0'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: '@angular/cdk',
            version: '^6.0.0'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: '@angular/material',
            version: '^6.0.0'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: 'webpack-cli',
            version: '2.1.2'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: 'ts-loader',
            version: '4.2.0'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: '@ngx-translate/core',
            version: '^10.0.1'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: '@ngx-translate/http-loader',
            version: '^3.0.1'
        });
        return tree;
    });
    rules.push((tree: Tree) => {
        let packageJsonContent = getFileContent(tree, `${options.directory}/package.json`);
        packageJsonContent = packageJsonContent.replace('__projectName__', options.name);
        createOrOverwriteFile(tree, `${options.directory}/package.json`, packageJsonContent);
        return tree;
    });
    return chain(rules);
}

/**
 * Check angular.json file and assign proper values to each build options if they exists.
 */
function adjustCLIConfig(options: Schema): Rule {
    return (tree) => {
        const cliConfig: WorkspaceSchema = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));;
        const architect: WorkspaceTargets | undefined = cliConfig.projects[options.name].architect;
        if (architect && architect.build) {
            architect.build.options.outputPath = 'dist/browser';
            architect.build.options.main = 'src/main.browser.ts';
            architect.build.options.styles = [{ input: "src/styles/main.scss" }];
            architect.build.options.tsConfig = 'src/tsconfig.app.json';
            if (architect.build.options.assets) {
                architect.build.options.assets.push({ glob: "manifest.json", input: "src", output: "/" });
                architect.build.options.assets.push({ glob: "ngsw-worker.js", input: "src/assets/fakeSW", output: "/" });
            }
            if (architect.build.configurations) {
                architect.build.configurations.production.serviceWorker = true;
            }
            delete cliConfig.defaultProject;
        }

        if (architect && architect.serve && architect.serve.configurations) {
            architect.serve.configurations.dev = { browserTarget: `${options.name}:build:dev` };
            delete architect.serve.configurations.production;
        }

        if (architect && architect.test) {
            if (architect.test.options.assets) {
                architect.test.options.assets.push({ glob: "manifest.json", input: "src", output: "/" });
            }
            architect.test.options.styles = [{ input: "src/styles/main.scss" }];
        }

        if (architect) {
            architect.lint = {
                builder: Builders.TsLint,
                options: {
                    tsConfig: ["src/tsconfig.app.json", "src/tsconfig.spec.json", "e2e/tsconfig.json"],
                    exclude: ["**/node_modules/**"]
                }
            };
            architect.server = {
                builder: Builders.Server,
                options: {
                    outputPath: 'dist/server',
                    main: 'src/main.server.ts',
                    tsConfig: 'src/tsconfig.server.json'
                }
            };
        }

        if (architect && architect.e2e) {
            architect.e2e.options.devServerTarget = `${options.name}:serve`;
        }

        cliConfig.projects[options.name].architect = architect;
        createOrOverwriteFile(tree, `${options.directory}/angular.json`, JSON.stringify(cliConfig, null, 2));
        return tree;
    }
}