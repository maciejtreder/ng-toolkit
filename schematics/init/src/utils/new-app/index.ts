import {
    Rule, chain,
    move, apply, url, mergeWith, MergeStrategy, externalSchematic
} from '@angular-devkit/schematics';
import { addGoogleAnalytics } from '../googleAnalytics/index';
import { getFileContent } from '@schematics/angular/utility/test';
import { addOrReplaceScriptInPackageJson, createGitIgnore, addDependencyToPackageJson, createOrOverwriteFile } from '@ng-toolkit/_utils';

export function newApp(options: any): Rule {
    const templateSource = apply(url('../utils/new-app/files'), [
        move(options.directory),
    ]);

    const rules: Rule[] = [];

    rules.push(mergeWith(templateSource, MergeStrategy.Overwrite));
    rules.push(overwriteMainFile(options));
    rules.push(createGitIgnore(options.directory));

    const serverlessOptions = {
        skipInstall : true,
        project: options.name,
        firebaseProject : options.firebaseProject,
        provider : options.provider,
        directory: options.directory
    };

    rules.push(externalSchematic('@ng-toolkit/serverless', 'ng-add', serverlessOptions));
    if (options.firebug) {
        rules.push(externalSchematic('@ng-toolkit/firebug', 'ng-add', options));
    }
    rules.push(((tree) => {
        const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
        packageJsonSource['collective'] = {
            type: 'opencollective',
            url: 'https://opencollective.com/ng-toolkit'
        };
        tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, '  '));
        return tree;
    }));
    rules.push(updatePackageJson(options));

    if (options.gaTrackingCode) {
        rules.push(addGoogleAnalytics(options));
    }

    return chain(rules);
}

function updatePackageJson(options: any): Rule {
    return chain([
        addOrReplaceScriptInPackageJson(options, 'postinstall', 'node credentials.js && opencollective postinstall'),
        addOrReplaceScriptInPackageJson(options, 'ng', 'ng'),
        addOrReplaceScriptInPackageJson(options, 'start', 'run-p build:watch credentials'),
        addOrReplaceScriptInPackageJson(options, 'credentials', 'node credentials.js'),
        addOrReplaceScriptInPackageJson(options, 'build:watch', 'ng serve'),
        addOrReplaceScriptInPackageJson(options, 'build:dev', 'run-p test:watch start'),
        addOrReplaceScriptInPackageJson(options, 'build', 'ng build'),
        addOrReplaceScriptInPackageJson(options, 'lint', 'ng lint --fix'),
        addOrReplaceScriptInPackageJson(options, 'build:prod', 'npm run test && npm run build:client-and-server-bundles && npm run webpack:server'),
        addOrReplaceScriptInPackageJson(options, 'webpack:server', 'webpack --config webpack.server.config.js --progress --colors'),
        addOrReplaceScriptInPackageJson(options, 'server', 'node local.js'),
        tree => {
            addDependencyToPackageJson(tree, options, '@nguniversal/express-engine', '^6.0.0');
            addDependencyToPackageJson(tree, options, '@nguniversal/module-map-ngfactory-loader', '^6.0.0');
            addDependencyToPackageJson(tree, options, 'typescript-collections', '^1.3.2');
            addDependencyToPackageJson(tree, options, 'cp-cli', '^1.1.0', true);
            addDependencyToPackageJson(tree, options, 'cpy-cli', '^1.0.1', true);
            addDependencyToPackageJson(tree, options, 'decompress', '^4.2.0', true);
            addDependencyToPackageJson(tree, options, 'decompress-targz', '^4.1.1', true);
            addDependencyToPackageJson(tree, options, 'express', '^4.15.2', true);
            addDependencyToPackageJson(tree, options, 'http-server', '^0.10.0', true);
            addDependencyToPackageJson(tree, options, 'karma-phantomjs-launcher', '^1.0.4', true);
            addDependencyToPackageJson(tree, options, 'node-wget', '^0.4.2', true);
            addDependencyToPackageJson(tree, options, 'npm-run-all', '^4.1.2', true);
            addDependencyToPackageJson(tree, options, 'pre-commit', '^1.2.2', true);
            addDependencyToPackageJson(tree, options, 'reflect-metadata', '^0.1.10', true);
            addDependencyToPackageJson(tree, options, 'serverless', '1.26.1', true);
            addDependencyToPackageJson(tree, options, 'sinon', '^4.5.0', true);
            addDependencyToPackageJson(tree, options, 'tslint', '^5.7.0', true);
        }
    ]);
}

function overwriteMainFile(options: any):Rule {
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
