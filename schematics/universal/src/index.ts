import { Rule, apply, url, move, chain, mergeWith, MergeStrategy, Tree, SchematicsException, SchematicContext } from '@angular-devkit/schematics';
import { isUniversal, addDependencyToPackageJson, getAppEntryModule, addImportStatement, getMainFilePath, addOrReplaceScriptInPackageJson, getDistFolder, getBrowserDistFolder, getBootStrapComponent, getRelativePath, updateDecorator, getDecoratorSettings } from '@ng-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

export default function index(options: any): Rule {

    const templateSource = apply(url('files'), [
        move(options.directory),
    ]);

    return chain([
        (tree: Tree) => {
            if (isUniversal(tree, options)) {
                throw new SchematicsException("This project has already universal support");
            }
            return tree;
        },
        mergeWith(templateSource, MergeStrategy.Overwrite),
        (tree: Tree, context: SchematicContext) => {
            // add dependencies
            addDependencyToPackageJson(tree, options, '@angular/platform-browser', '^6.0.0');
            addDependencyToPackageJson(tree, options, '@angular/platform-server', '^6.0.0');
            addDependencyToPackageJson(tree, options, '@nguniversal/module-map-ngfactory-loader', '^6.0.0');
            addDependencyToPackageJson(tree, options, 'webpack-cli', '^2.1.4');
            addDependencyToPackageJson(tree, options, 'ts-loader', '4.2.0');
            addDependencyToPackageJson(tree, options, '@nguniversal/express-engine', '^6.0.0');
            addDependencyToPackageJson(tree, options, 'cors', '~2.8.4');

            // update CLI config
            const distFolder = getDistFolder(tree, options);
            const cliConfig: any = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
            cliConfig.projects[options.project].architect.server =
            {
              "builder": "@angular-devkit/build-angular:server",
              "options": {
                "outputPath": `${distFolder}/server`,
                "main": "src/main.server.ts",
                "tsConfig": "src/tsconfig.server.json"
              }
            };
            tree.overwrite(`${options.directory}/angular.json`, JSON.stringify(cliConfig, null, "  "));


            // manipulate entry modules
            // add proper module
            const entryModule = getAppEntryModule(tree, options);
            const serverModulePath = `${options.directory}/src/app/app.server.module.ts`;
            addImportStatement(tree, serverModulePath, entryModule.moduleName, getRelativePath(serverModulePath, entryModule.filePath));
            
            const serverNgModuleDecorator = getDecoratorSettings(tree, serverModulePath, 'NgModule');
            serverNgModuleDecorator.imports.push(entryModule.moduleName);
            
            
            // add bootstrap component
            const bootstrapComponent = getBootStrapComponent(tree, entryModule.filePath);
            addImportStatement(tree, serverModulePath, bootstrapComponent.component, getRelativePath(serverModulePath, bootstrapComponent.filePath));
            serverNgModuleDecorator.bootstrap = [bootstrapComponent.component];
            serverNgModuleDecorator.imports.push(`BrowserModule.withServerTransition({appId: '${bootstrapComponent.appId}'})`);
            updateDecorator(tree, serverModulePath, 'NgModule', serverNgModuleDecorator);


            // manipulate browser module
            const browserModulePath = `${options.directory}/src/app/app.browser.module.ts`;
            addImportStatement(tree, browserModulePath, entryModule.moduleName, getRelativePath(browserModulePath, entryModule.filePath));
            
            const browserNgModuleDecorator = getDecoratorSettings(tree, browserModulePath, 'NgModule');
            browserNgModuleDecorator.imports.push(entryModule.moduleName);
            browserNgModuleDecorator.imports.push(`BrowserModule.withServerTransition({appId: '${bootstrapComponent.appId}'})`);
            browserNgModuleDecorator.bootstrap = [bootstrapComponent.component];
            addImportStatement(tree, browserModulePath, bootstrapComponent.component, getRelativePath(browserModulePath, bootstrapComponent.filePath));
            updateDecorator(tree, browserModulePath, 'NgModule', browserNgModuleDecorator);

            // manipulate old entry module
            const appNgModuleDecorator = getDecoratorSettings(tree, entryModule.filePath, 'NgModule');
            delete appNgModuleDecorator.bootstrap;
            appNgModuleDecorator.imports.splice(appNgModuleDecorator.imports.indexOf("BrowserModule"), 1);
            appNgModuleDecorator.imports.push("CommonModule");
            addImportStatement(tree, entryModule.filePath, 'CommonModule', '@angular/common');

            // update main file
            const mainFilePath = getMainFilePath(tree, options);
            const entryFileSource: string = getFileContent(tree, `${options.directory}/${mainFilePath}`);

            tree.overwrite(mainFilePath, entryFileSource.replace(new RegExp(`bootstrapModule\\(\\s*${entryModule.moduleName}\\s*\\)`), `bootstrapModule(AppBrowserModule)`));
            addImportStatement(tree, mainFilePath, 'AppBrowserModule', getRelativePath(mainFilePath, browserModulePath));

            // upate server.ts and local.js with proper dist folder
            tree.overwrite(`${options.directory}/server.ts`, getFileContent(tree, `${options.directory}/server.ts`).replace(/__distFolder__/g, distFolder).replace(/__browserDistFolder__/g, getBrowserDistFolder(tree, options)));
            tree.overwrite(`${options.directory}/local.js`, getFileContent(tree, `${options.directory}/local.js`).replace(/__distFolder__/g, distFolder));

            // add installation task
            if (!options.skipInstall) {
                context.addTask(new NodePackageInstallTask(options.directory));
            }
            return tree;
        },
        addOrReplaceScriptInPackageJson(options, 'build:server', `ng run ${options.project}:server && webpack --config webpack.server.config.js --progress --colors`)
    ]);
}