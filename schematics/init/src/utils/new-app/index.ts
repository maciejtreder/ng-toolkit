import {
    Rule, chain,
    move, apply, url, mergeWith, MergeStrategy, externalSchematic
} from '@angular-devkit/schematics';
import { addGoogleAnalytics } from '../googleAnalytics/index';
import { getFileContent } from '@schematics/angular/utility/test';
import { addOrReplaceScriptInPackageJson, createGitIgnore, createOrOverwriteFile } from '@ng-toolkit/_utils';
import { addPackageJsonDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';

export function newApp(options: any): Rule {
    const templateSource = apply(url('../utils/new-app/files'), [
        move(options.directory),
    ]);

    const rules: Rule[] = [];

    rules.push(mergeWith(templateSource, MergeStrategy.Overwrite));
    rules.push(overwriteMainFile(options));
    rules.push(createGitIgnore(options.directory));

    const serverlessOptions = {
        skipInstall: true,
        project: options.name,
        firebaseProject: options.firebaseProject,
        provider: options.provider,
        directory: options.directory
    };
    rules.push(externalSchematic('@ng-toolkit/serverless', 'ng-add', serverlessOptions));
    if (options.firebug) {
        rules.push(externalSchematic('@ng-toolkit/firebug', 'ng-add', options));
    }
    rules.push((tree: Tree) => {
        const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
        packageJsonSource['collective'] = {
            type: 'opencollective',
            url: 'https://opencollective.com/ng-toolkit'
        };
        tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, 4));
        return tree;
    });
    rules.push(updatePackageJson());
    if (options.gaTrackingCode) {
        rules.push(addGoogleAnalytics(options));
    }

    return chain(rules);
}

function updatePackageJson(): Rule {
    return chain([
        addOrReplaceScriptInPackageJson('postinstall', 'node credentials.js && opencollective postinstall'),
        addOrReplaceScriptInPackageJson('ng', 'ng'),
        addOrReplaceScriptInPackageJson('start', 'run-p build:watch credentials'),
        addOrReplaceScriptInPackageJson('credentials', 'node credentials.js'),
        addOrReplaceScriptInPackageJson('build:watch', 'ng serve'),
        addOrReplaceScriptInPackageJson('build:dev', 'run-p test:watch start'),
        addOrReplaceScriptInPackageJson('build', 'ng build'),
        addOrReplaceScriptInPackageJson('lint', 'ng lint --fix'),
        addOrReplaceScriptInPackageJson('build:prod', 'npm run test && npm run build:client-and-server-bundles && npm run webpack:server'),
        addOrReplaceScriptInPackageJson('webpack:server', 'webpack --config webpack.server.config.js --progress --colors'),
        addOrReplaceScriptInPackageJson('server', 'node local.js'),
        tree => {
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Default,
                name: '@nguniversal/express-engine',
                version: '^6.0.0'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Default,
                name: '@nguniversal/module-map-ngfactory-loader',
                version: '^6.0.0'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Default,
                name: 'typescript-collections',
                version: '^1.3.2'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'cp-cli',
                version: '^1.1.0'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'cpy-cli',
                version: '^1.0.1'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Default,
                name: 'decompress',
                version: '^4.2.0'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'decompress-targz',
                version: '^4.1.1'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'express',
                version: '^4.15.2'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'http-server',
                version: '^0.10.0'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'karma-phantomjs-launcher',
                version: '^1.0.4'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'node-wget',
                version: '^0.4.2'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'npm-run-all',
                version: '^4.1.2'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'pre-commit',
                version: '^1.2.2'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'reflect-metadata',
                version: '^0.1.10'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'serverless',
                version: '1.26.1'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'sinon',
                version: '^4.5.0'
            });
            addPackageJsonDependency(tree, {
                type: NodeDependencyType.Dev,
                name: 'tslint',
                version: '^5.7.0'
            });
        }
    ]);
}

function overwriteMainFile(options: any): Rule {
    return (tree => {
        tree.rename(`${options.directory}/src/main.ts`, `${options.directory}/src/main.browser.ts`);
        createOrOverwriteFile(tree, `${options.directory}/src/main.browser.ts`, `import { enableProdMode } from '@angular/core';
            import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

            import { environment } from './environments/environment';
            import { AppBrowserModule } from './app/app.browser.module';

            if (environment.production) {
                enableProdMode();
            }

            platformBrowserDynamic().bootstrapModule(AppBrowserModule);
        `);
        return tree;
    })

}
