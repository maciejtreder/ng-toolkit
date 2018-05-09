import {
    apply,
    chain, externalSchematic, MergeStrategy, mergeWith, move,
    Rule, Tree, url
} from '@angular-devkit/schematics';

import { getFileContent } from '@schematics/angular/utility/test';
import { newApp } from '../utils/new-app/index';
import {
    addDependencyToPackageJson, addImportStatement, addOrReplaceScriptInPackageJson,
    createOrOverwriteFile
} from '../utils/index';

export default function (options: any): Rule {
    if (!options.directory) {
        options.directory = options.name;
    }

    const specificFiles = apply(url('./files'), [
        move(options.directory),
    ]);

    return chain( [
        externalSchematic('@schematics/angular', 'application', options),
        ((tree: Tree) => {
            tree.getDir(`${options.directory}/src/app`).visit(visitor => {
                tree.delete(visitor);
            });
            return tree;
        }),
        mergeWith(specificFiles, MergeStrategy.Overwrite),
        updateCLI(options),
        newApp(options),
        updatePackageJson(options),
        (tree => {
            tree.rename(`${options.directory}/ngsw-config.json`, `${options.directory}/src/ngsw-config.json`);
            return tree;
        }),
        downgradeRXJS()
    ]);
}

function updatePackageJson(options: any): Rule {

    return chain([
        addDependencyToPackageJson(options, '@angular/service-worker', '^5.2.0'),
        addDependencyToPackageJson(options, '@angular/platform-server', '^5.2.0'),
        addDependencyToPackageJson(options, '@angular/cdk', '^5.2.0'),
        addDependencyToPackageJson(options, '@angular/material', '^5.2.0'),
        addDependencyToPackageJson(options, '@angular/cli', '~1.7.2'),
        addDependencyToPackageJson(options, 'ts-loader', '^2.3.7', true),
        addDependencyToPackageJson(options, '@ngx-translate/core', '^9.1.1'),
        addDependencyToPackageJson(options, '@ngx-translate/http-loader', '^2.0.1'),
        addOrReplaceScriptInPackageJson(options, 'build:client-and-server-bundles', 'ng build --app 1 --prod && ng build --prod --app 2 --output-hashing=false'),
        addOrReplaceScriptInPackageJson(options, 'test', 'ng test --single-run --code-coverage'),
        addOrReplaceScriptInPackageJson(options, 'test:watch', 'ng test --code-coverage')
    ]);
}

function updateCLI(options: any): Rule {
    return (tree: Tree) => {
        const configSource = JSON.parse(getFileContent(tree, `${options.directory}/.angular-cli.json`));

        const devApp = configSource.apps.splice(0, 1)[0];
        const prodBrowser = JSON.parse(JSON.stringify(devApp));
        const prodServer = JSON.parse(JSON.stringify(devApp));

        configSource.apps.splice(0, 1);

        devApp.serviceWorker = true;
        devApp.outDir = `dist/browser`;
        devApp.assets.push({glob: '**/*', input: '../firebug-lite', output: './firebug-lite'})
        devApp.assets.push({glob: 'ngsw-worker.js', input: './', output: './ngsw-worker.js'})
        devApp.main = 'main.browser.ts';
        devApp.styles = ['styles/main.scss'];
        devApp.environments = {
            dev: 'environments/environment.ts',
            firebug: 'environments/environment.firebug.ts',
        }

        prodBrowser.serviceWorker = true;
        prodBrowser.outDir = `dist/browser`;
        prodBrowser.assets.push('manifest.json')
        prodBrowser.main = 'main.browser.ts';
        prodBrowser.styles = ['styles/main.scss'];
        prodBrowser.environments = {
            prod: 'environments/environment.prod.ts'
        }

        prodServer.outDir = `dist/server`;
        prodServer.assets.push('manifest.json')
        prodServer.main = 'main.server.ts';
        prodServer.platform = 'server';
        prodServer.tsconfig = 'tsconfig.server.json';
        prodServer.styles = ['styles/main.scss'];
        prodServer.polyfills = null;
        prodServer.environments = {
            prod: 'environments/environment.prod.ts'
        }

        configSource.apps.push(devApp);
        configSource.apps.push(prodBrowser);
        configSource.apps.push(prodServer);

        tree.overwrite(`${options.directory}/.angular-cli.json`, JSON.stringify(configSource, null, '  '));
    }
}

function downgradeRXJS(): Rule {
    return tree => {
        tree.visit(visitor => {
            if (visitor.endsWith('.ts')) {

                let source = getFileContent(tree, visitor);
                if (source.match('import.*(of|from).*from \'rxjs\';')) {
                    let oldSource = source;

                    source = source.replace(/import {(.*)(of)(.*)} from 'rxjs';/, 'import {$1 $3} from \'rxjs\';');
                    source = source.replace(/import {(.*)(from)(.*)} from 'rxjs';/, 'import {$1 $3} from \'rxjs\';');
                    source = source.replace(/import {(.*)(,,|, ,|,  ,)(.*)} from 'rxjs';/, 'import {$1, $3} from \'rxjs\';');
                    source = source.replace(/import ({,|{ ,|{  ,)(.*)} from 'rxjs';/, 'import {$2} from \'rxjs\';');
                    source = source.replace(/import {(.*)(,   }|,  }|, }|,}) from 'rxjs';/, 'import {$1} from \'rxjs\';');

                    createOrOverwriteFile(tree, visitor, source);


                    if (oldSource.match('import.*(of).*from \'rxjs\';')) {
                        addImportStatement(tree, visitor, 'import { of } from \'rxjs/observable/of\';');
                    }

                    if (oldSource.match('import.*(from).*from \'rxjs\';')) {
                        addImportStatement(tree, visitor, 'import { from } from \'rxjs/observable/from\';');
                    }
                }
            }
        });
        return tree;
    }
}