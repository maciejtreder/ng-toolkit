import { Rule, chain, Tree, SchematicContext } from '@angular-devkit/schematics';
import { applyAndLog, updateProject, addImportStatement, addToNgModule, 
    getMainServerFilePath, normalizePath, NgToolkitException, 
    getBootStrapComponent, getAppEntryModule, addDependencyInjection,
    createOrOverwriteFile, getMethodBodyEdges, implementInterface,
    addMethod, getNgToolkitInfo, updateNgToolkitInfo } from '@ng-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as bugsnag from 'bugsnag';

export default function index(options: any): Rule {
    bugsnag.register('0b326fddc255310e516875c9874fed91');
    bugsnag.onBeforeNotify((notification) => {
        let metaData = notification.events[0].metaData;
        metaData.subsystem = {
            package: 'pwa',
            options: options
        };
    });


    let rule: Rule = chain([
        
        (tree: Tree, context: SchematicContext) => {
            updateProject(tree, options);


            //check if angular/pwa was applied

            const cliConfig: any = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
            if (!cliConfig.projects[options.project].architect.build.configurations.production.serviceWorker) {
                throw new NgToolkitException(`Run 'ng add @angular/pwa' before applying this package.`);
            }
            
            // add entry to server module
            let serverModulePath = options.serverModule?options.serverModule:findServerModule(tree, options);
            if (serverModulePath) {
                addImportStatement(tree, serverModulePath, 'NgtPwaMockModule', '@ng-toolkit/pwa');
                addToNgModule(tree, serverModulePath, 'imports', 'NgtPwaMockModule');
            }

            const ngToolkitSettings = getNgToolkitInfo(tree, options);
            
            if (!ngToolkitSettings.pwa) {

                //add update mechanism
                let bootstrapComponent = getBootStrapComponent(tree, getAppEntryModule(tree, options).filePath)[0];

                let swUpdateVar = addDependencyInjection(tree, bootstrapComponent.filePath, 'swUpdate', 'SwUpdate', '@angular/service-worker');

                implementInterface(tree, bootstrapComponent.filePath, 'OnInit', '@angular/core');

                let methodBodyEdges = getMethodBodyEdges(tree, bootstrapComponent.filePath, 'ngOnInit');
                let fileContent = getFileContent(tree, bootstrapComponent.filePath);
                if (!methodBodyEdges) {
                    addMethod(tree, bootstrapComponent.filePath, 'public ngOnInit():void {}');
                    methodBodyEdges = getMethodBodyEdges(tree, bootstrapComponent.filePath, 'ngOnInit');
                    fileContent = getFileContent(tree, bootstrapComponent.filePath);
                }
                if (methodBodyEdges)
                    fileContent = fileContent.substring(0, methodBodyEdges.start) + `
        if (this.${swUpdateVar}.isEnabled) {
            this.${swUpdateVar}.available.subscribe((evt) => {
                console.log('service worker updated');
            });
    
            this.${swUpdateVar}.checkForUpdate().then(() => {
                // noop
            }).catch((err) => {
                console.error('error when checking for update', err);
            });
        }` + fileContent.substring(methodBodyEdges.end);
                createOrOverwriteFile(tree, bootstrapComponent.filePath, fileContent);

            }
            ngToolkitSettings.pwa = options;
            updateNgToolkitInfo(tree, options, ngToolkitSettings);

            if (!options.skipInstall) {
                context.addTask(new NodePackageInstallTask(options.directory));
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

function findServerModule(tree: Tree, options: any): string | undefined {
    let mainServerFilePath = getMainServerFilePath(tree, options);
    if (!mainServerFilePath) {
        console.log(`\u001B[33mINFO: \u001b[0mCan't find server build in angular.json; Use @ng-toolkit/universal for server-side rendering.`);
        return undefined;
    }
    let mainFileContent: string = getFileContent(tree, `${options.directory}/${mainServerFilePath}`);
    let match = mainFileContent.match(/export[\s\S]*?{[\s\S]*?}[\s\S]*?from[\s\S]*?['"](.*)['"]/);
    if (!match) {
        throw new NgToolkitException(`Can't find server app module in $${options.directory}/${mainServerFilePath}`, {fileContent: mainFileContent});
    }
    return normalizePath(`${options.directory}/${mainServerFilePath.substring(0,mainServerFilePath.lastIndexOf('/'))}/${match[1]}.ts`);
}
