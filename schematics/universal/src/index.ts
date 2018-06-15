import { Rule, apply, url, move, chain, mergeWith, MergeStrategy, Tree, SchematicContext, externalSchematic } from '@angular-devkit/schematics';
import { updateProject, addDependencyToPackageJson, getAppEntryModule, addImportStatement, getMainFilePath, getDistFolder, getBrowserDistFolder, getBootStrapComponent, getRelativePath, updateDecorator, getNgToolkitInfo, updateNgToolkitInfo, applyAndLog, getDecoratorSettings } from '@ng-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as bugsnag from 'bugsnag';

export default function index(options: any): Rule {
    bugsnag.register('0b326fddc255310e516875c9874fed91');
    bugsnag.onBeforeNotify((notification) => {
        let metaData = notification.events[0].metaData;
        metaData.subsystem = {
            package: 'universal',
            options: options
        };
    });

    const templateSource = apply(url('files'), [
        move(options.directory),
    ]);

    let rule: Rule = chain([
        tree => {
            const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
            if (packageJsonSource.dependencies['@ng-toolkit/serverless']) {
                tree.delete(`${options.directory}/local.js`);
                tree.delete(`${options.directory}/server.ts`);
                tree.delete(`${options.directory}/webpack.server.config.js`);
            } 
        },

        mergeWith(templateSource, MergeStrategy.Overwrite),
        (tree: Tree, context: SchematicContext) => {
            // update project name
            updateProject(tree, options);
            
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
            cliConfig.projects[options.project].architect.build.options.outputPath = `${distFolder}/browser`
            cliConfig.projects[options.project].architect.server =
            {
              "builder": "@angular-devkit/build-angular:server",
              "options": {
                "outputPath": `${distFolder}/server`,
                "main": `src/main.server.ts`,
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
            serverNgModuleDecorator.imports.unshift(entryModule.moduleName);


            const browserModulePath = `${options.directory}/src/app/app.browser.module.ts`;
            const browserNgModuleDecorator = getDecoratorSettings(tree, browserModulePath, 'NgModule');
            
            // add bootstrap component
            const bootstrapComponents = getBootStrapComponent(tree, entryModule.filePath);
            bootstrapComponents.forEach(bootstrapComponent => {
                addImportStatement(tree, serverModulePath, bootstrapComponent.component, getRelativePath(serverModulePath, bootstrapComponent.filePath));
                serverNgModuleDecorator.bootstrap = [bootstrapComponent.component];
                serverNgModuleDecorator.imports.push(`BrowserModule.withServerTransition({appId: '${bootstrapComponent.appId}'})`);
                            
                // manipulate browser module
                addImportStatement(tree, browserModulePath, entryModule.moduleName, getRelativePath(browserModulePath, entryModule.filePath));
                
                browserNgModuleDecorator.imports.push(entryModule.moduleName);
                browserNgModuleDecorator.imports.push(`BrowserModule.withServerTransition({appId: '${bootstrapComponent.appId}'})`);
                browserNgModuleDecorator.bootstrap = [bootstrapComponent.component];
                addImportStatement(tree, browserModulePath, bootstrapComponent.component, getRelativePath(browserModulePath, bootstrapComponent.filePath));
            });

            updateDecorator(tree, serverModulePath, 'NgModule', serverNgModuleDecorator);
            updateDecorator(tree, browserModulePath, 'NgModule', browserNgModuleDecorator);
            
            
            // manipulate old entry module
            const appNgModuleDecorator = getDecoratorSettings(tree, entryModule.filePath, 'NgModule');
            delete appNgModuleDecorator.bootstrap;
            appNgModuleDecorator.imports.splice(appNgModuleDecorator.imports.indexOf(appNgModuleDecorator.imports.find((entry: string) => {
                return entry.indexOf("BrowserModule") > -1;
            })), 1);
            appNgModuleDecorator.imports.push("CommonModule");
            addImportStatement(tree, entryModule.filePath, 'CommonModule', '@angular/common');
            updateDecorator(tree, entryModule.filePath, 'NgModule', appNgModuleDecorator);

            
            // update main file
            const mainFilePath = getMainFilePath(tree, options);
            

            const entryFileSource: string = getFileContent(tree, `${options.directory}/${mainFilePath}`);
            

            tree.overwrite(`${options.directory}/${mainFilePath}`, entryFileSource.replace(new RegExp(`bootstrapModule\\(\\s*${entryModule.moduleName}\\s*\\)`), `bootstrapModule(AppBrowserModule)`));
            
            addImportStatement(tree, `${options.directory}/${mainFilePath}`, 'AppBrowserModule', getRelativePath(mainFilePath, browserModulePath));
            

            
            // upate server.ts and local.js and webpack config with proper dist folder
            tree.overwrite(`${options.directory}/server.ts`, getFileContent(tree, `${options.directory}/server.ts`).replace(/__distFolder__/g, distFolder).replace(/__browserDistFolder__/g, getBrowserDistFolder(tree, options)));
            tree.overwrite(`${options.directory}/local.js`, getFileContent(tree, `${options.directory}/local.js`).replace(/__distFolder__/g, distFolder));
            tree.overwrite(`${options.directory}/webpack.server.config.js`, getFileContent(tree, `${options.directory}/webpack.server.config.js`).replace(/__distFolder__/g, distFolder));

            
            //add scripts
            addOrReplaceScriptInPackageJson(tree, options, "build:server:prod", `ng run ${options.project}:server && webpack --config webpack.server.config.js --progress --colors`);
            addOrReplaceScriptInPackageJson(tree, options, "build:browser:prod", "ng build --prod");
            addOrReplaceScriptInPackageJson(tree, options, "build:prod", "npm run build:server:prod && npm run build:browser:prod");
            addOrReplaceScriptInPackageJson(tree, options, "server", "node local.js");

            
            // add installation task
            if (!options.skipInstall) {
                context.addTask(new NodePackageInstallTask(options.directory));
            }

            
            //applying other schematics (if installed)
            const ngToolkitSettings = getNgToolkitInfo(tree, options);
            ngToolkitSettings.universal = options;
            updateNgToolkitInfo(tree, options, ngToolkitSettings);
            if (ngToolkitSettings.serverless) {
                ngToolkitSettings.serverless.directory = options.directory;
                ngToolkitSettings.serverless.skipInstall = true;
                return externalSchematic('@ng-toolkit/serverless', 'ng-add', ngToolkitSettings.serverless)(tree, context)
            }
        return tree;
        }
    ]);


    if (!options.disableBugsnag) {
        return applyAndLog(rule);
    } else {
        return rule;
    }
}

function addOrReplaceScriptInPackageJson(tree: Tree, options: any, name: string, script: string) {
    const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
    packageJsonSource.scripts[name] = script;
    tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, "  "));
}