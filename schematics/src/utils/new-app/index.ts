import {
    Rule, chain,
    move, apply, url, mergeWith, MergeStrategy
} from '@angular-devkit/schematics';
import { createGitIgnore, addServerless, addOrReplaceScriptInPackageJson, addDependencyToPackageJson, createOrOverwriteFile } from '../index';
import { addFireBug } from '../firebug/index';
import { addGoogleAnalytics } from '../googleAnalytics/index';
import { getFileContent } from '@schematics/angular/utility/test';

export function newApp(options: any): Rule {
    const templateSource = apply(url('../utils/new-app/files'), [
        move(options.directory),
    ]);

    let rules: Rule[] = [];

    rules.push(mergeWith(templateSource, MergeStrategy.Overwrite));
    rules.push(overwriteMainFile(options));
    rules.push(createGitIgnore(options.directory));
    rules.push(addServerless(options));
    rules.push((tree => {
        const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
        packageJsonSource['collective'] = {
            type: "opencollective",
            url: "https://opencollective.com/angular-universal-pwa"
        };
        tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, "  "));
        return tree;
    }));
    rules.push(updatePackageJson(options));

    if (options.firebug) {
        rules.push(addFireBug(options));
        rules.push(addOrReplaceScriptInPackageJson(options, 'build:watch:firebug', 'ng serve -env=firebug'),)
        rules.push(addOrReplaceScriptInPackageJson(options, 'build:firebug', 'run-p build:watch:firebug credentials'),)
    }

    if (options.gaTrackingCode) {
        rules.push(addGoogleAnalytics(options));
    }

    return chain(rules);
}

function updatePackageJson(options: any): Rule {
    return chain([
        addOrReplaceScriptInPackageJson(options, 'postinstall', 'node postinstall.js'),
        addOrReplaceScriptInPackageJson(options, 'ng', 'ng'),
        addOrReplaceScriptInPackageJson(options, 'start', 'run-p build:watch credentials'),
        addOrReplaceScriptInPackageJson(options, 'build:watch', 'ng serve'),
        addOrReplaceScriptInPackageJson(options, 'credentials', 'node credentials.js && opencollective postinstall'),
        addOrReplaceScriptInPackageJson(options, 'build:dev', 'run-p test:watch start'),
        addOrReplaceScriptInPackageJson(options, 'build', 'ng build'),
        addOrReplaceScriptInPackageJson(options, 'lint', 'ng lint --fix'),
        addOrReplaceScriptInPackageJson(options, 'build:prod', 'npm run test && npm run build:client-and-server-bundles && npm run webpack:server'),
        addOrReplaceScriptInPackageJson(options, 'webpack:server', 'webpack --config webpack.server.config.js --progress --colors'),
        addOrReplaceScriptInPackageJson(options, 'server', 'node local.js'),
        addDependencyToPackageJson(options, 'cors', '~2.8.4'),
        addDependencyToPackageJson(options, '@nguniversal/common', '^5.0.0-beta.8'),
        addDependencyToPackageJson(options, '@nguniversal/express-engine', '^5.0.0-beta.8'),
        addDependencyToPackageJson(options, '@nguniversal/module-map-ngfactory-loader', '^5.0.0-beta.8'),
        addDependencyToPackageJson(options, 'typescript-collections', '^1.3.2'),
        addDependencyToPackageJson(options, 'cp-cli', '^1.1.0', true),
        addDependencyToPackageJson(options, 'cpy-cli', '^1.0.1', true),
        addDependencyToPackageJson(options, 'decompress', '^4.2.0', true),
        addDependencyToPackageJson(options, 'decompress-targz', '^4.1.1', true),
        addDependencyToPackageJson(options, 'express', '^4.15.2', true),
        addDependencyToPackageJson(options, 'http-server', '^0.10.0', true),
        addDependencyToPackageJson(options, 'karma-phantomjs-launcher', '^1.0.4', true),
        addDependencyToPackageJson(options, 'node-wget', '^0.4.2', true),
        addDependencyToPackageJson(options, 'npm-run-all', '^4.1.2', true),
        addDependencyToPackageJson(options, 'opencollective', '^1.0.3', true),
        addDependencyToPackageJson(options, 'pre-commit', '^1.2.2', true),
        addDependencyToPackageJson(options, 'reflect-metadata', '^0.1.10', true),
        addDependencyToPackageJson(options, 'serverless', '1.26.1', true),
        addDependencyToPackageJson(options, 'sinon', '^4.5.0', true),
        addDependencyToPackageJson(options, 'tslint', '^5.7.0', true)
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
