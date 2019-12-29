import { Rule, chain, Tree, SchematicContext } from '@angular-devkit/schematics';
import {
    applyAndLog, addImportStatement, addToNgModule, getMainServerFilePath, normalizePath,
    NgToolkitException, getBootStrapComponent, getAppEntryModule, addDependencyInjection, createOrOverwriteFile,
    getMethodBodyEdges, implementInterface, addMethod, getNgToolkitInfo, updateNgToolkitInfo
} from '@ng-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { WorkspaceSchema, WorkspaceProject } from '@schematics/angular/utility/workspace-models';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { IToolkitPWASchema } from './schema';
import outdent from 'outdent';
import bugsnag from '@bugsnag/js';

const bugsnagClient = bugsnag('0b326fddc255310e516875c9874fed91');

export default function addPWA(options: IToolkitPWASchema): Rule {
    if (!options.clientProject) {
        options.clientProject = options.project;
    }

    // Register bugsnag in order to catch and notify any rule error.
    bugsnagClient.config.beforeSend = (report) => {
        report.metaData = {
            subsystem: {
                package: 'pwa',
                options: options
            }
        }
    }

    const rules: Rule[] = [];

    // Check if @angular/pwa was applied.
    rules.push(checkAngularPWA(options));

    // Add entry to server module.
    rules.push(addEntryServerModule(options));

    // Add update mechanism for service workers.
    rules.push(updateSWMechanism(options));

    if (!options.disableBugsnag) {
        return applyAndLog(chain(rules), bugsnagClient);
    } else {
        return chain(rules);
    }
}

function findServerModule(tree: Tree, options: IToolkitPWASchema): string | undefined {
    let mainServerFilePath = getMainServerFilePath(tree, options);
    if (!mainServerFilePath) {
        console.log(`\u001B[33mINFO: \u001b[0mCan't find server build in angular.json; Use @ng-toolkit/universal for server-side rendering.`);
        return undefined;
    }
    let mainFileContent: string = getFileContent(tree, `${options.directory}/${mainServerFilePath}`);
    let match = mainFileContent.match(/export[\s\S]*?{[\s\S]*?}[\s\S]*?from[\s\S]*?['"](.*)['"]/);
    if (!match) {
        throw new NgToolkitException(`Can't find server app module in $${options.directory}/${mainServerFilePath}`, { fileContent: mainFileContent });
    }
    return normalizePath(`${options.directory}/${mainServerFilePath.substring(0, mainServerFilePath.lastIndexOf('/'))}/${match[1]}.ts`);
}

/**
 * Check if the project has already run `ng-add angular/pwa` schematic.
 * @param options `@ng-toolkit/pwa` schema
 */
function checkAngularPWA(options: IToolkitPWASchema): Rule {
    return (tree: Tree) => {
        const cliConfig: WorkspaceSchema = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
        const project: WorkspaceProject = cliConfig.projects[options.clientProject]
        if (!(project.architect && project.architect.build && project.architect.build.configurations && project.architect.build.configurations.production.serviceWorker)) {
            // TODO: Should we include the `angular/pwa` schematic if not found?
            throw new NgToolkitException(`Run 'ng add @angular/pwa' before applying this schematics.`);
        }
        return tree;
    }
}

function addEntryServerModule(options: IToolkitPWASchema): Rule {
    return (tree: Tree) => {
        let serverModulePath = options.serverModule ? options.serverModule : findServerModule(tree, options);
        if (serverModulePath) {
            addImportStatement(tree, serverModulePath, 'NgtPwaMockModule', '@ng-toolkit/pwa');
            addToNgModule(tree, serverModulePath, 'imports', 'NgtPwaMockModule');
        }
        return tree;
    }
}

function updateSWMechanism(options: IToolkitPWASchema): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const ngToolkitSettings = getNgToolkitInfo(tree, options);
        if (!ngToolkitSettings.pwa) {
            let bootstrapComponent = getBootStrapComponent(tree, getAppEntryModule(tree, options).filePath)[0];
            let swUpdateVar = addDependencyInjection(tree, bootstrapComponent.filePath, 'swUpdate', 'SwUpdate', '@angular/service-worker');
            implementInterface(tree, bootstrapComponent.filePath, 'OnInit', '@angular/core');

            let methodBodyEdges = getMethodBodyEdges(tree, bootstrapComponent.filePath, 'ngOnInit');
            let fileContent = getFileContent(tree, bootstrapComponent.filePath);
            if (!methodBodyEdges) {
                addMethod(tree, bootstrapComponent.filePath, 'public ngOnInit(): void {}');
                methodBodyEdges = getMethodBodyEdges(tree, bootstrapComponent.filePath, 'ngOnInit');
                fileContent = getFileContent(tree, bootstrapComponent.filePath);
            }
            if (methodBodyEdges) {
                fileContent = fileContent.substring(0, methodBodyEdges.start) + outdent({ trimLeadingNewline: false })`
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
        }

        ngToolkitSettings.pwa = options;
        updateNgToolkitInfo(tree, ngToolkitSettings, options);

        if (!options.skipInstall) {
            context.addTask(new NodePackageInstallTask(options.directory));
        }

        return tree;
    }
}