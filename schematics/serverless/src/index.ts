import { apply, chain, mergeWith, move, Rule, Tree, url, MergeStrategy, SchematicContext, Source } from '@angular-devkit/schematics';
import {
    applyAndLog, addOrReplaceScriptInPackageJson, addOpenCollective, updateGitIgnore, addDependencyInjection,
    createOrOverwriteFile, addEntryToEnvironment, getMethodBody, updateMethod, addMethod, addImportStatement, getDistFolder,
    isUniversal, getBrowserDistFolder, getServerDistFolder, implementInterface, getNgToolkitInfo, updateNgToolkitInfo, addDependencyToPackageJson, parseYML2JS, parseJS2YML
} from '@ng-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Path } from '@angular-devkit/core';
import { NodeDependencyType } from '@schematics/angular/utility/dependencies';
import { IServerlessSchema } from './schema';
import outdent from 'outdent';
import bugsnag from '@bugsnag/js';

const bugsnagClient = bugsnag('0b326fddc255310e516875c9874fed91');

export default function addServerless(options: IServerlessSchema): Rule {
    if (!options.clientProject) {
        options.clientProject = options.project;
    }
    // Register bugsnag in order to catch and notify any rule error.
    bugsnagClient.config.beforeSend = (report) => {
        report.metaData = {
            subsystem: {
                package: 'serverless',
                options: options
            }
        }
    }

    // Initialize Serverless property with empty object values.
    options.serverless = {
        aws: {},
        gcloud: {}
    };

    // Move source files to resolved path in the virtual tree.
    const templateSource = apply(url('files/common'), [
        move(options.directory),
    ]);

    // Create an empty array to push our rules.
    const rules: Rule[] = [];

    // Check if Universal and Serverless Rules
    rules.push(checkIfUniversal(options, templateSource));
    rules.push(checkIfServerless(options));

    // Add Dependencies to package json by using custom function instead of Angular built-in.
    // The Angular way do not let us customize the project path to check for package.json.
    rules.push((tree: Tree) => {
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: 'ts-loader',
            version: '^6.2.1',
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: 'webpack-cli',
            version: '^3.3.10'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: 'cors',
            version: '^2.8.5'
        });
        // TODO: Remove the note below.
        // cp-cli got deprecated by the author in favour of cpy-cli.
        if (options.provider === 'firebase') {
            addDependencyToPackageJson(tree, options, {
                type: NodeDependencyType.Default,
                name: 'cpy-cli',
                version: '^3.0.0'
            });
        }
        return tree;
    });

    // Add Open Collective postinstall script
    rules.push(addOpenCollective(options));

    // Check passed providers and generate proper files along with further package json changes.
    if (options.provider === 'firebase') {
        rules.push(updateGitIgnore(options, '/functions/node_modules/'));
        const source = apply(url('./files/firebase'), [
            move(options.directory)
        ]);
        rules.push(setFirebaseFunctions(options));
        rules.push(addOrReplaceScriptInPackageJson(options, 'build:prod:deploy', 'npm run build:prod && cd functions && npm install && cd .. && firebase deploy'));
        rules.push(mergeWith(source, MergeStrategy.Overwrite));
    }

    if (options.provider === 'gcloud' || options.provider === 'aws') {
        // We need serverless dependency to properly set Google Cloud or AWS Dependencies.
        rules.push((tree: Tree) => {
            addDependencyToPackageJson(tree, options, {
                type: NodeDependencyType.Dev,
                name: 'serverless',
                version: '^1.60.0'
            });
            return tree;
        });

        if (options.provider === 'gcloud') {
            rules.push(addServerlessGcloud(options));
        } else if (options.provider === 'aws') {
            rules.push(addServerlessAWS(options));
        }
    }

    if (options.provider === 'aws' && options.offline) {
        rules.push(addServerlessOffline(options));
    }

    // Generate files in order to run local server on development mode.
    // TODO: Check if I shall include all the typescript lambda logic plus webpack in a single function or 
    // keep the splitted like now.
    rules.push(addLocalFile(options));
    rules.push(editTSConfigFile(options));
    // TODO: Add webpack typescript config file option.
    rules.push((tree: Tree) => {
        let webpack = getFileContent(tree, `${options.directory}/webpack.server.config.js`);
        tree.overwrite(`${options.directory}/webpack.server.config.js`, webpack.replace("__distFolder__", getDistFolder(tree, options)));
    });

    if (options.provider !== 'firebase') {
        rules.push(updateEnvironment(options));
        rules.push(updateAppEntryFile(options));
    }

    // Modify package scripts according to provider
    rules.push(addBuildScriptsAndFiles(options));

    if (!options.skipInstall) {
        rules.push((tree: Tree, context: SchematicContext) => {
            tree.exists('.'); // noop
            context.addTask(new NodePackageInstallTask(options.directory));
        })
    }

    rules.push((tree: Tree) => {
        const ngToolkitSettings = getNgToolkitInfo(tree, options);
        ngToolkitSettings.serverless = options;
        updateNgToolkitInfo(tree, ngToolkitSettings, options);
    });

    if (!options.disableBugsnag) {
        return applyAndLog(chain(rules), bugsnagClient);
    } else {
        return chain(rules);
    }
}

function checkIfUniversal(options: IServerlessSchema, templateSource: Source): Rule {
    return (tree: Tree) => {
        const ngToolkitSettings = getNgToolkitInfo(tree, options);
        if (!ngToolkitSettings.universal) {
            const subRules: Rule[] = [];
            subRules.push(mergeWith(templateSource, MergeStrategy.Overwrite));
            subRules.push((subTree: Tree) => {
                if (isUniversal(subTree, options)) {
                    subTree.rename(`${options.directory}/server_universal.ts`, `${options.directory}/server.ts`);
                    subTree.delete(`${options.directory}/server_static.ts`);
                } else {
                    subTree.delete(`${options.directory}/server_universal.ts`);
                    subTree.rename(`${options.directory}/server_static.ts`, `${options.directory}/server.ts`);
                }

                const serverFileContent = getFileContent(tree, `${options.directory}/server.ts`);
                tree.overwrite(`${options.directory}/server.ts`, serverFileContent
                    .replace('__distBrowserFolder__', getBrowserDistFolder(tree, options))
                    .replace('__distServerFolder__', getServerDistFolder(tree, options)));
                return subTree;
            })
            return chain(subRules);
        } else {
            return tree;
        }
    }
}

function checkIfServerless(options: IServerlessSchema): Rule {
    return (tree: Tree) => {
        const ngToolkitSettings = getNgToolkitInfo(tree, options);
        if (ngToolkitSettings.serverless) {
            switch (options.provider) {
                case 'aws': {
                    tree.delete(`${options.directory}/lambda.js`);
                    tree.delete(`${options.directory}/lambda.ts`);
                    tree.delete(`${options.directory}/serverless.yml`);
                    break;
                }
                case 'gcloud': {
                    tree.delete(`${options.directory}/index.js`);
                    tree.delete(`${options.directory}/serverless.yml`);
                    break;
                }
                case 'firebase': {
                    tree.delete(`${options.directory}/functions/index.js`);
                    break;
                }
            }
        }
        return tree;
    }
}

function setFirebaseFunctions(options: IServerlessSchema): Rule {
    return (tree: Tree) => {
        createOrOverwriteFile(tree, `${options.directory}/functions/package.json`, outdent`
        {
            "name": "functions",
            "description": "Cloud Functions for Firebase",
            "scripts": {
                "serve": "firebase serve --only functions",
                "shell": "firebase functions:shell",
                "start": "npm run shell",
                "deploy": "firebase deploy --only functions",
                "logs": "firebase functions:log"
            },
            "dependencies": {
                "firebase-admin": "^8.9.0",
                "firebase-functions": "^3.3.0"
            },
            "private": true
        }`);

        let firebaseProjectSettings = {};
        if (options.firebaseProject) {
            firebaseProjectSettings = {
                projects: {
                    default: options.firebaseProject
                }
            };
        }
        if (!tree.exists(`${options.directory}/.firebaserc`)) {
            tree.create(`${options.directory}/.firebaserc`, JSON.stringify(firebaseProjectSettings, null, 2));
        }

        let firebaseJson: any;
        if (tree.exists(`${options.directory}/firebase.json`)) {
            firebaseJson = JSON.parse(getFileContent(tree, `${options.directory}/firebase.json`));
            firebaseJson.hosting = {
                "public": "functions/dist",
                "rewrites": [
                    {
                        "source": "**",
                        "function": "http"
                    }
                ]
            };
        } else {
            firebaseJson = {
                "hosting": {
                    "public": "functions/dist",
                    "rewrites": [
                        {
                            "source": "**",
                            "function": "http"
                        }
                    ]
                }
            };
        }
        createOrOverwriteFile(tree, `${options.directory}/firebase.json`, JSON.stringify(firebaseJson, null, 2));
        return tree;
    }
}

function addBuildScriptsAndFiles(options: IServerlessSchema): Rule {
    return (tree: Tree) => {
        const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
        const universal: boolean = isUniversal(tree, options);

        let serverlessBasePath;
        switch (options.provider) {
            default: serverlessBasePath = '/'; break;
            case 'aws': serverlessBasePath = '/production/'; break;
            case 'gcloud': serverlessBasePath = '/http/'; break;
        }

        packageJsonSource.scripts['build:browser:prod'] = `ng build --prod`;
        packageJsonSource.scripts['build:browser:serverless'] = `ng build --prod --base-href ${serverlessBasePath}`;
        packageJsonSource.scripts['build:serverless'] = `npm run build:browser:serverless && npm run build:server:serverless`;
        packageJsonSource.scripts['build:prod'] = `npm run build:browser:prod && npm run build:server:prod`;
        packageJsonSource.scripts['server'] = `${options.lambdaTS ? 'ts-' : ''}node local.${options.lambdaTS ? 'ts' : 'js'}`;
        packageJsonSource.scripts['build:prod:deploy'] = `npm run build:prod && npm run deploy`;
        packageJsonSource.scripts['build:serverless:deploy'] = `npm run build:serverless && npm run deploy`;

        if (options.provider === 'firebase') {
            packageJsonSource.scripts['deploy'] = `cpy-cli dist/ functions/dist/ && cd functions && npm install && firebase deploy`;
        } else {
            packageJsonSource.scripts['deploy'] = `serverless deploy`;
        }

        if (universal) {
            packageJsonSource.scripts['build:server:prod'] = `ng run ${options.clientProject}:server && webpack --config webpack.server.config.js --progress --colors`;
            if (options.provider != 'firebase') {
                packageJsonSource.scripts['build:server:serverless'] = `ng run ${options.clientProject}:server:serverless && webpack --config webpack.server.config.js --progress --colors`;
            } else {
                packageJsonSource.scripts['build:server:serverless'] = `ng run ${options.clientProject}:server && webpack --config webpack.server.config.js --progress --colors`;
            }
        } else {
            packageJsonSource.scripts['build:server:prod'] = `webpack --config webpack.server.config.js --progress --colors`;
            packageJsonSource.scripts['build:server:serverless'] = `webpack --config webpack.server.config.js --progress --colors`;
        }

        tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, 2));
        return tree;
    }
}

function addServerlessAWS(options: IServerlessSchema): Rule {
    const fileName = options.serverless && options.serverless.aws && options.serverless.aws.filename ? options.serverless.aws.filename : 'serverless.yml';

    const source = apply(url('./files/aws'), [
        move(options.directory)
    ]);

    return chain([
        mergeWith(source),
        (tree: Tree) => {
            tree.rename(`${options.directory}/serverless-aws.yml`, `${options.directory}/${fileName}`);
            tree.overwrite(`${options.directory}/${fileName}`, getFileContent(tree, `${options.directory}/${fileName}`).replace('__appName__', options.clientProject.toLowerCase()));

             // Add `serverless-plugin-typescript` to the serverless yml file.
            if (options.lambdaTS) {
                const data = parseYML2JS(tree, `${options.directory}/${fileName}`);
                data.plugins.push('serverless-plugin-typescript');
                parseJS2YML(tree, data, `${options.directory}/${fileName}`);
            }

            // Remove lambda file based on `lambdaTS` option.
            tree.delete(`${options.directory}/lambda.${options.lambdaTS ? 'js' : 'ts'}`);
            addDependencyToPackageJson(tree, options, {
                type: NodeDependencyType.Default,
                name: 'aws-serverless-express',
                version: '^3.3.6'
            });
            addDependencyToPackageJson(tree, options, {
                type: NodeDependencyType.Dev,
                name: 'serverless-apigw-binary',
                version: '^0.4.4'
            });
            return tree;
        }
    ]);
}

function addServerlessGcloud(options: IServerlessSchema): Rule {
    const fileName = options.serverless && options.serverless.gcloud && options.serverless.gcloud.filename ? options.serverless.gcloud.filename : 'serverless.yml';

    const source = apply(url('./files/gcloud'), [
        move(options.directory)
    ]);

    return chain([
        mergeWith(source),
        (tree: Tree) => {
            tree.rename(`${options.directory}/serverless-gcloud.yml`, `${options.directory}/${fileName}`);
            tree.overwrite(`${options.directory}/${fileName}`, getFileContent(tree, `${options.directory}/${fileName}`).replace('__appName__', options.clientProject.toLowerCase()));
            addDependencyToPackageJson(tree, options, {
                type: NodeDependencyType.Dev,
                name: 'firebase-admin',
                version: '^8.9.0'
            });
            addDependencyToPackageJson(tree, options, {
                type: NodeDependencyType.Dev,
                name: 'firebase-functions',
                version: '^3.3.0'
            });
            addDependencyToPackageJson(tree, options, {
                type: NodeDependencyType.Default,
                name: 'serverless-google-cloudfunctions',
                version: '^2.3.3'
            });
            return tree;
        }
    ]);
}

// Generate lambda handles by using Typescript instead of plain javascript.
// This will require extra serverless plugins in order to transpile the files into plain js ones.
function addLocalFile(options: IServerlessSchema): Rule {
    return _ => options.lambdaTS ? addLocalTypescript(options) : addLocalJavascript(options);
}

function addLocalJavascript(options: IServerlessSchema): Rule {
    return tree => {
        createOrOverwriteFile(tree, `${options.directory}/local.js`, outdent`
            const port = process.env.PORT || 8080;

            const server = require('./${getDistFolder(tree, options)}/server');

            server.app.listen(port, () => {
                console.log("Listening on: http://localhost:" + port);
            });
        `);
    }
}

function addLocalTypescript(options: IServerlessSchema): Rule {
    return tree => {
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: 'aws-serverless-express',
            version: '^3.3.6'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: 'serverless-plugin-typescript',
            version: '^1.1.9'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: '@types/aws-lambda',
            version: '^8.10.36'
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: '@types/aws-serverless-express',
            version: '^3.3.2'
        });
        createOrOverwriteFile(tree, `${options.directory}/local.ts`, outdent`
            import { run } from './dist/server';

            // Run locally our express server
            run();
        `);
    }
}

/**
 * Change the default `tsconfig.json` file to enable default imports for some JS packages.
 * Also set the module code generation to CommonJS to enable webpack typescript compilation and other stuff.
 * @param options serverless options schema
 */
function editTSConfigFile(options: IServerlessSchema): Rule {
    return tree => {
        const tsConfig: any = JSON.parse(getFileContent(tree, `${options.directory}/tsconfig.json`));
        tsConfig.compilerOptions['esModuleInterop'] = true;
        tsConfig.compilerOptions['allowSyntheticDefaultImports'] = true;
        tsConfig.compilerOptions['module'] = 'commonjs';
        tree.overwrite(`${options.directory}/tsconfig.json`, JSON.stringify(tsConfig, null, 2));
        return tree;
    }
}

/** 
 * Parse YML file into JS Object to add the properties required for serverless-offline to work with serverless.
 * Also add the `serverless-offline` as devDependency.
 */
function addServerlessOffline(options: IServerlessSchema): Rule {
    const fileName = options.serverless && options.serverless.aws && options.serverless.aws.filename ? options.serverless.aws.filename : 'serverless.yml';

    return tree => {
        const data = parseYML2JS(tree, `${options.directory}/${fileName}`);
        data.plugins.push('serverless-offline');
        data.package['include'] = ['dist/**']
        parseJS2YML(tree, data, `${options.directory}/${fileName}`);

        // Add serverless-offline as dev dependency.
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: 'serverless-offline',
            version: '^6.0.0-alpha.56'
        });
        return tree
    }
}

function updateEnvironment(options: IServerlessSchema): Rule {
    return tree => {
        if (!isUniversal(tree, options) || options.provider === 'firebase') {
            return tree;
        }

        let serverlessBasePath: string;
        serverlessBasePath = options.provider === 'aws' ? '/production/' : '/http/';

        createOrOverwriteFile(tree, `${options.directory}/src/environments/environment.serverless.ts`, getFileContent(tree, `${options.directory}/src/environments/environment.prod.ts`));

        tree.getDir(`${options.directory}/src/environments`).visit((path: Path) => {
            if (path.endsWith('.ts')) {
                addEntryToEnvironment(tree, path, 'baseHref', path.indexOf('serverless') > -1 ? serverlessBasePath : '/');
            }
        });

        //update CLI with new configuration
        const cliConfig: any = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
        const project: any = cliConfig.projects[options.clientProject].architect;
        for (let property in project) {
            if (project.hasOwnProperty(property) && (project[property].builder === '@angular-devkit/build-angular:server')) {
                if (!project[property].configurations) {
                    project[property].configurations = {};
                }
                project[property].configurations.serverless = {
                    "fileReplacements": [
                        {
                            "replace": "src/environments/environment.ts",
                            "with": "src/environments/environment.serverless.ts"
                        }
                    ]
                };
            }
        }

        tree.overwrite(`${options.directory}/angular.json`, JSON.stringify(cliConfig, null, 2));
        return tree;
    }
}

function updateAppEntryFile(options: IServerlessSchema): Rule {
    return tree => {
        if (!isUniversal(tree, options)) {
            return tree;
        }
        const appComponentFilePath = `${options.directory}/src/app/app.component.ts`;
        const ngOnInit = getMethodBody(tree, appComponentFilePath, 'ngOnInit');
        addImportStatement(tree, appComponentFilePath, 'environment', '../environments/environment');
        implementInterface(tree, appComponentFilePath, 'OnInit', '@angular\/core');
        addImportStatement(tree, appComponentFilePath, 'Inject', '@angular\/core');
        addImportStatement(tree, appComponentFilePath, 'isPlatformBrowser', '@angular\/common');

        addDependencyInjection(tree, appComponentFilePath, 'document', 'any', '@angular/common', 'DOCUMENT');
        addDependencyInjection(tree, appComponentFilePath, 'platformId', 'any', '@angular/core', 'PLATFORM_ID');

        if (ngOnInit) {
            updateMethod(tree, appComponentFilePath, 'ngOnInit', ngOnInit + outdent`
                if (!isPlatformBrowser(this.platformId)) {
                    const bases = this.document.getElementsByTagName('base');

                    if (bases.length > 0) {
                        bases[0].setAttribute('href', environment.baseHref);
                    }
                }`
            );
        } else {
            addMethod(tree, appComponentFilePath, outdent`
                public ngOnInit(): void {
                    if (!isPlatformBrowser(this.platformId)) {
                        const bases = this.document.getElementsByTagName('base');
                
                        if (bases.length > 0) {
                            bases[0].setAttribute('href', environment.baseHref);
                        }
                    }
                }`
            );
        }
        return tree;
    }
}
