import {
    apply,
    chain,
    mergeWith,
    move,
    Rule,
    Tree,
    url,
    MergeStrategy,
    SchematicContext,
    SchematicsException,
    template,
    forEach,
    FileEntry,
} from "@angular-devkit/schematics";
import {
    applyAndLog,
    addOrReplaceScriptInPackageJson,
    addOpenCollective,
    updateGitIgnore,
    addDependencyInjection,
    createOrOverwriteFile,
    addEntryToEnvironment,
    getMethodBody,
    updateMethod,
    addMethod,
    addImportStatement,
    getDistFolder,
    isUniversal,
    getBrowserDistFolder,
    getServerDistFolder,
    implementInterface,
    getNgToolkitInfo,
    updateNgToolkitInfo,
    addDependencyToPackageJson,
    parseYML2JS,
    parseJS2YML,
} from "@ng-toolkit/_utils";
import { getFileContent } from "@schematics/angular/utility/test";
import { NodePackageInstallTask } from "@angular-devkit/schematics/tasks";
import { Path, experimental } from "@angular-devkit/core";
import { NodeDependencyType } from "@schematics/angular/utility/dependencies";
import { ServerlessSchema } from "./schema";
import { parse, stringify } from "comment-json";
import outdent from "outdent";
import Bugsnag from "@bugsnag/js";
import { normalize } from "path";

export default function addServerless(options: ServerlessSchema): Rule {
    // Initialize Serverless property with empty object values.
    options.serverless = {
        aws: {},
        gcloud: {},
    };

    // Create an empty array to push our rules.
    const rules: Rule[] = [];

    // Check if it is a workspace or an application
    rules.push((tree: Tree) => {
        const workspaceConfig = tree.read("/angular.json");
        if (!workspaceConfig) {
            throw new SchematicsException("Could not find Angular workspace configuration");
        }

        // convert workspace to string
        const workspaceContent = workspaceConfig.toString();

        // parse workspace string into JSON object
        const workspace: experimental.workspace.WorkspaceSchema = JSON.parse(workspaceContent);

        if (!options.project && workspace.defaultProject) {
            options.project = workspace.defaultProject;
        } else {
            if (!options.clientProject) {
                options.clientProject = options.project;
            }
        }
        // Move into project if workspace
        const project = workspace.projects[options.project];
        if (project) {
            options.path = normalize(project.root);
        }
        return tree;
    });

    // Check if Universal and Serverless Rules
    // rules.push(checkIfUniversal(options));
    rules.push(checkIfServerless(options));

    // Add Dependencies to package json by using custom function instead of Angular built-in.
    // The Angular way do not let us customize the project path to check for package.json.
    rules.push((tree: Tree) => {
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: "ts-loader",
            version: "^8.0.0",
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: "cors",
            version: "^2.8.5",
        });
        // TODO: Remove the note below.
        // cp-cli got deprecated by the author in favour of cpy-cli.
        if (options.provider === "firebase") {
            addDependencyToPackageJson(tree, options, {
                type: NodeDependencyType.Default,
                name: "cpy-cli",
                version: "^3.1.1",
            });
        }
        return tree;
    });

    // Add Open Collective postinstall script
    rules.push(addOpenCollective(options));

    // Check passed providers and generate proper files along with further package json changes.
    if (options.provider === "firebase") {
        rules.push(addServerlessFirebase(options));
    }

    if (options.provider === "gcloud" || options.provider === "aws") {
        // We need serverless dependency to properly set Google Cloud or AWS Dependencies.
        rules.push((tree: Tree) => {
            addDependencyToPackageJson(tree, options, {
                type: NodeDependencyType.Dev,
                name: "serverless",
                version: "^1.70.0",
            });
            return tree;
        });

        if (options.provider === "gcloud") {
            rules.push(addServerlessGcloud(options));
        } else if (options.provider === "aws") {
            rules.push(addServerlessAWS(options));
        }
    }

    if (options.provider === "aws" && options.offline) {
        rules.push(addServerlessOffline(options));
    }

    // Generate files in order to run local server on development mode.
    rules.push(addLocalFile(options));
    rules.push(editTSConfigFile(options));

    if (options.provider !== "firebase") {
        rules.push(updateEnvironment(options));
        rules.push(updateAppEntryFile(options));
    }

    // Modify package scripts according to provider
    rules.push(addBuildScriptsAndFiles(options));

    if (!options.skipInstall) {
        rules.push((tree: Tree, context: SchematicContext) => {
            tree.exists("."); // noop
            context.addTask(new NodePackageInstallTask(options.directory));
        });
    }

    rules.push((tree: Tree) => {
        const ngToolkitSettings = getNgToolkitInfo(tree, options);
        ngToolkitSettings.serverless = options;
        updateNgToolkitInfo(tree, ngToolkitSettings, options);
    });

    if (!options.disableBugsnag) {
        const bugsnagClient = Bugsnag.start({
            apiKey: "0b326fddc255310e516875c9874fed91",
            onError: (report) => {
                report.addMetadata("subsystem", {
                    package: "serverless",
                    options: options,
                });
            },
        });
        return applyAndLog(chain(rules), bugsnagClient);
    } else {
        return chain(rules);
    }
}

// function checkIfUniversal(options: ServerlessSchema): Rule {
//     return (tree: Tree) => {
//         const ngToolkitSettings = getNgToolkitInfo(tree, options);
//         if (!ngToolkitSettings.universal) {
//             const subRules: Rule[] = [];
//             subRules.push((subTree: Tree) => {
//                 if (isUniversal(subTree, options)) {
//                     subTree.rename(
//                         `${options.directory}/server_universal.ts`,
//                         `${options.directory}/server.ts`,
//                     );
//                     subTree.delete(`${options.directory}/server_static.ts`);
//                 } else {
//                     subTree.delete(`${options.directory}/server_universal.ts`);
//                     subTree.rename(
//                         `${options.directory}/server_static.ts`,
//                         `${options.directory}/server.ts`,
//                     );
//                 }

//                 const serverFileContent = getFileContent(tree, `${options.directory}/server.ts`);
//                 tree.overwrite(
//                     `${options.directory}/server.ts`,
//                     serverFileContent
//                         .replace("__distBrowserFolder__", getBrowserDistFolder(tree, options))
//                         .replace("__distServerFolder__", getServerDistFolder(tree, options)),
//                 );
//                 return subTree;
//             });
//             return chain(subRules);
//         } else {
//             return tree;
//         }
//     };
// }

function checkIfServerless(options: ServerlessSchema): Rule {
    return (tree: Tree) => {
        const ngToolkitSettings = getNgToolkitInfo(tree, options);
        if (ngToolkitSettings.serverless) {
            switch (options.provider) {
                case "aws": {
                    if (options.lambdaTS) {
                        tree.delete(`${options.path}/lambda.ts`);
                    } else {
                        tree.delete(`${options.path}/lambda.js`);
                    }
                    tree.delete(`${options.path}/serverless.yml`);
                    break;
                }
                case "gcloud": {
                    tree.delete(`${options.path}/index.js`);
                    tree.delete(`${options.path}/serverless.yml`);
                    break;
                }
                case "firebase": {
                    tree.delete(`${options.path}/functions/index.js`);
                    break;
                }
            }
        }
        return tree;
    };
}

function setFirebaseFunctions(options: ServerlessSchema): Rule {
    return (tree: Tree) => {
        createOrOverwriteFile(
            tree,
            `${options.path}/functions/package.json`,
            outdent`
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
        }`,
        );

        let firebaseProjectSettings = {};
        if (options.firebaseProject) {
            firebaseProjectSettings = {
                projects: {
                    default: options.firebaseProject,
                },
            };
        }
        if (!tree.exists(`${options.directory}/.firebaserc`)) {
            tree.create(
                `${options.directory}/.firebaserc`,
                JSON.stringify(firebaseProjectSettings, null, 2),
            );
        }

        let firebaseJson: Record<string, unknown>;
        if (tree.exists(`${options.directory}/firebase.json`)) {
            firebaseJson = parse(getFileContent(tree, `${options.directory}/firebase.json`));
            firebaseJson.hosting = {
                public: "functions/dist",
                rewrites: [
                    {
                        source: "**",
                        function: "http",
                    },
                ],
            };
        } else {
            firebaseJson = {
                hosting: {
                    public: "functions/dist",
                    rewrites: [
                        {
                            source: "**",
                            function: "http",
                        },
                    ],
                },
            };
        }
        createOrOverwriteFile(
            tree,
            `${options.directory}/firebase.json`,
            JSON.stringify(firebaseJson, null, 2),
        );
        return tree;
    };
}

function addBuildScriptsAndFiles(options: ServerlessSchema): Rule {
    return (tree: Tree) => {
        const packageJsonSource = parse(getFileContent(tree, `${options.directory}/package.json`));
        const universal = isUniversal(tree, options);

        let serverlessBasePath;
        switch (options.provider) {
            default:
                serverlessBasePath = "/";
                break;
            case "aws":
                serverlessBasePath = "/production/";
                break;
            case "gcloud":
                serverlessBasePath = "/http/";
                break;
        }

        packageJsonSource.scripts["build:browser:prod"] = `ng build --prod`;
        packageJsonSource.scripts[
            "build:browser:serverless"
        ] = `ng build --prod --base-href ${serverlessBasePath}`;
        packageJsonSource.scripts["server"] = `${options.lambdaTS ? "ts-" : ""}node local.${
            options.lambdaTS ? "ts" : "js"
        }`;
        packageJsonSource.scripts["build:prod:deploy"] = `npm run build:prod && npm run deploy`;
        packageJsonSource.scripts[
            "build:serverless:deploy"
        ] = `npm run build:serverless && npm run deploy`;

        if (options.provider === "firebase") {
            packageJsonSource.scripts[
                "deploy"
            ] = `cpy-cli dist/ functions/dist/ && cd functions && npm install && firebase deploy`;
        } else {
            packageJsonSource.scripts["deploy"] = `serverless deploy`;
        }

        if (universal) {
            packageJsonSource.scripts[
                "build:serverless"
            ] = `npm run build:browser:serverless && npm run build:server`;
            packageJsonSource.scripts[
                "build:server:prod"
            ] = `ng run ${options.clientProject}:server:production`;
            packageJsonSource.scripts[
                "build:prod"
            ] = `npm run build:browser:prod && npm run build:server:prod`;
        } else {
            packageJsonSource.scripts["build:serverless"] = `npm run build:browser:serverless`;
            packageJsonSource.scripts["build:prod"] = `npm run build:browser:prod`;
        }

        // if (universal) {
        //     packageJsonSource.scripts[
        //         "build:server:prod"
        //     ] = `ng run ${options.clientProject}:server && webpack --config webpack.server.config.js --progress --colors`;
        //     if (options.provider != "firebase") {
        //         packageJsonSource.scripts[
        //             "build:server:serverless"
        //         ] = `ng run ${options.clientProject}:server:serverless && webpack --config webpack.server.config.js --progress --colors`;
        //     } else {
        //         packageJsonSource.scripts[
        //             "build:server:serverless"
        //         ] = `ng run ${options.clientProject}:server && webpack --config webpack.server.config.js --progress --colors`;
        //     }
        // } else {
        //     packageJsonSource.scripts[
        //         "build:server:prod"
        //     ] = `webpack --config webpack.server.config.js --progress --colors`;
        //     packageJsonSource.scripts[
        //         "build:server:serverless"
        //     ] = `webpack --config webpack.server.config.js --progress --colors`;
        // }

        tree.overwrite(
            `${options.directory}/package.json`,
            JSON.stringify(packageJsonSource, null, 2),
        );
        return tree;
    };
}

function addServerlessFirebase(options: ServerlessSchema): Rule {
    return (tree: Tree) => {
        const sourceTemplate = apply(url("./files/firebase/"), [
            template(options),
            move(options.path),
            forEach((fileEntry: FileEntry) => {
                if (tree.exists(fileEntry.path)) {
                    tree.overwrite(fileEntry.path, fileEntry.content);
                }
                return fileEntry;
            }),
        ]);
        return chain([
            updateGitIgnore(options, "/functions/node_modules/"),
            setFirebaseFunctions(options),
            addOrReplaceScriptInPackageJson(
                options,
                "build:prod:deploy",
                "npm run build:prod && cd functions && npm install && cd .. && firebase deploy",
            ),
            mergeWith(sourceTemplate, MergeStrategy.Overwrite),
        ]);
    };
}

function addServerlessAWS(options: ServerlessSchema): Rule {
    return (tree: Tree) => {
        const fileName =
            options.serverless && options.serverless.aws && options.serverless.aws.filename
                ? options.serverless.aws.filename
                : "serverless.yml";
        const sourceTemplate = apply(url("./files/aws/"), [
            template(options),
            move(options.path),
            forEach((fileEntry: FileEntry) => {
                if (tree.exists(fileEntry.path)) {
                    tree.overwrite(fileEntry.path, fileEntry.content);
                }
                return fileEntry;
            }),
        ]);
        return chain([
            mergeWith(sourceTemplate, MergeStrategy.Overwrite),
            (tree: Tree) => {
                tree.rename(`${options.path}/serverless-aws.yml`, `${options.path}/${fileName}`);
                tree.overwrite(
                    `${options.path}/${fileName}`,
                    getFileContent(tree, `${options.path}/${fileName}`).replace(
                        "__appName__",
                        options.clientProject.toLowerCase(),
                    ),
                );

                // Add `serverless-plugin-typescript` to the serverless yml file.
                if (options.lambdaTS) {
                    const data = parseYML2JS(tree, `${options.path}/${fileName}`);
                    if (data && typeof data === "object") {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const newData: Record<string, any> = data as Record<string, any>;
                        newData.plugins.push("serverless-plugin-typescript");
                        parseJS2YML(tree, newData, `${options.path}/${fileName}`);
                    }
                }

                // Remove lambda file based on `lambdaTS` option.
                tree.delete(`${options.path}/lambda.${options.lambdaTS ? "js" : "ts"}`);
                addDependencyToPackageJson(tree, options, {
                    type: NodeDependencyType.Default,
                    name: "aws-serverless-express",
                    version: "^3.3.8",
                });
                addDependencyToPackageJson(tree, options, {
                    type: NodeDependencyType.Dev,
                    name: "serverless-apigw-binary",
                    version: "^0.4.4",
                });
                return tree;
            },
        ]);
    };
}

function addServerlessGcloud(options: ServerlessSchema): Rule {
    return (tree: Tree) => {
        const fileName =
            options.serverless && options.serverless.gcloud && options.serverless.gcloud.filename
                ? options.serverless.gcloud.filename
                : "serverless.yml";
        const sourceTemplate = apply(url("./files/gcloud/"), [
            template(options),
            move(options.path),
            forEach((fileEntry: FileEntry) => {
                if (tree.exists(fileEntry.path)) {
                    tree.overwrite(fileEntry.path, fileEntry.content);
                }
                return fileEntry;
            }),
        ]);
        return chain([
            mergeWith(sourceTemplate, MergeStrategy.Overwrite),
            (tree: Tree) => {
                tree.rename(`${options.path}/serverless-gcloud.yml`, `${options.path}/${fileName}`);
                tree.overwrite(
                    `${options.path}/${fileName}`,
                    getFileContent(tree, `${options.path}/${fileName}`).replace(
                        "__appName__",
                        options.clientProject.toLowerCase(),
                    ),
                );
                addDependencyToPackageJson(tree, options, {
                    type: NodeDependencyType.Dev,
                    name: "firebase-admin",
                    version: "^9.0.0",
                });
                addDependencyToPackageJson(tree, options, {
                    type: NodeDependencyType.Dev,
                    name: "firebase-functions",
                    version: "^3.11.0",
                });
                addDependencyToPackageJson(tree, options, {
                    type: NodeDependencyType.Default,
                    name: "serverless-google-cloudfunctions",
                    version: "^3.1.0",
                });
                return tree;
            },
        ]);
    };
}

// Generate lambda handles by using Typescript instead of plain javascript.
// This will require extra serverless plugins in order to transpile the files into plain js ones.
function addLocalFile(options: ServerlessSchema): Rule {
    return () => (options.lambdaTS ? addLocalTypescript(options) : addLocalJavascript(options));
}

function addLocalJavascript(options: ServerlessSchema): Rule {
    return (tree) => {
        createOrOverwriteFile(
            tree,
            `${options.path}/local.js`,
            outdent`
            const port = process.env.PORT || 8080;

            const server = require('./${getDistFolder(tree, options)}/server');

            server.app.listen(port, () => {
                console.log("Listening on: http://localhost:" + port);
            });
        `,
        );
    };
}

function addLocalTypescript(options: ServerlessSchema): Rule {
    return (tree) => {
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Default,
            name: "aws-serverless-express",
            version: "^3.3.8",
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: "@kingdarboja/serverless-plugin-typescript",
            version: "^1.4.1",
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: "@types/aws-lambda",
            version: "^8.10.60",
        });
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: "@types/aws-serverless-express",
            version: "^3.3.3",
        });
        createOrOverwriteFile(
            tree,
            `${options.path}/local.ts`,
            outdent`
            import { run } from './dist/server';

            // Run locally our express server
            run();
        `,
        );
    };
}

/**
 * Change the default `tsconfig.json` file to enable default imports for some JS packages.
 * Also set the module code generation to CommonJS to enable webpack typescript compilation and other stuff.
 * @param options serverless options schema
 */
function editTSConfigFile(options: ServerlessSchema): Rule {
    return (tree) => {
        const tsConfig = parse(getFileContent(tree, `${options.directory}/tsconfig.base.json`));
        // tsConfig.compilerOptions["esModuleInterop"] = true;
        tsConfig.compilerOptions["allowSyntheticDefaultImports"] = true;
        tsConfig.compilerOptions["module"] = "commonjs";
        tree.overwrite(`${options.directory}/tsconfig.base.json`, stringify(tsConfig, null, 2));
        return tree;
    };
}

/**
 * Parse YML file into JS Object to add the properties required for serverless-offline to work with serverless.
 * Also add the `serverless-offline` as devDependency.
 */
function addServerlessOffline(options: ServerlessSchema): Rule {
    const fileName =
        options.serverless && options.serverless.aws && options.serverless.aws.filename
            ? options.serverless.aws.filename
            : "serverless.yml";

    return (tree) => {
        const data = parseYML2JS(tree, `${options.path}/${fileName}`);
        if (data && typeof data === "object") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newData: Record<string, any> = data as Record<string, any>;
            newData.plugins.push("serverless-offline");
            newData.package.include = ["dist/**"];
            parseJS2YML(tree, newData, `${options.path}/${fileName}`);
        }

        // Add serverless-offline as dev dependency.
        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: "serverless-offline",
            version: "^6.5.0",
        });
        return tree;
    };
}

function updateEnvironment(options: ServerlessSchema): Rule {
    return (tree) => {
        if (!isUniversal(tree, options) || options.provider === "firebase") {
            return tree;
        }

        const serverlessBasePath = options.provider === "aws" ? "/production/" : "/http/";

        createOrOverwriteFile(
            tree,
            `${options.path}/src/environments/environment.serverless.ts`,
            getFileContent(tree, `${options.path}/src/environments/environment.prod.ts`),
        );

        tree.getDir(`${options.path}/src/environments`).visit((path: Path) => {
            if (path.endsWith(".ts")) {
                addEntryToEnvironment(
                    tree,
                    path,
                    "baseHref",
                    path.indexOf("serverless") > -1 ? serverlessBasePath : "/",
                );
            }
        });

        // Update CLI with new configuration
        const cliConfig = parse(getFileContent(tree, `${options.directory}/angular.json`));
        const project = cliConfig.projects[options.clientProject].architect;
        for (const property in project) {
            if (
                Object.prototype.hasOwnProperty.call(project, property) &&
                project[property].builder === "@angular-devkit/build-angular:server"
            ) {
                if (!project[property].configurations) {
                    project[property].configurations = {};
                }
                project[property].configurations.serverless = {
                    fileReplacements: [
                        {
                            replace: "src/environments/environment.ts",
                            with: "src/environments/environment.serverless.ts",
                        },
                    ],
                };
            }
        }

        tree.overwrite(`${options.directory}/angular.json`, JSON.stringify(cliConfig, null, 2));
        return tree;
    };
}

function updateAppEntryFile(options: ServerlessSchema): Rule {
    return (tree) => {
        if (!isUniversal(tree, options)) {
            return tree;
        }
        const appComponentFilePath = `${options.path}/src/app/app.component.ts`;
        const ngOnInit = getMethodBody(tree, appComponentFilePath, "ngOnInit");
        addImportStatement(
            tree,
            appComponentFilePath,
            "environment",
            "./src/environments/environment.ts",
        );
        implementInterface(tree, appComponentFilePath, "OnInit", "@angular/core");
        addImportStatement(tree, appComponentFilePath, "Inject", "@angular/core");
        addImportStatement(tree, appComponentFilePath, "isPlatformBrowser", "@angular/common");

        addDependencyInjection(
            tree,
            appComponentFilePath,
            "document",
            "any",
            "@angular/common",
            "DOCUMENT",
        );
        addDependencyInjection(
            tree,
            appComponentFilePath,
            "platformId",
            "any",
            "@angular/core",
            "PLATFORM_ID",
        );

        if (ngOnInit) {
            updateMethod(
                tree,
                appComponentFilePath,
                "ngOnInit",
                ngOnInit +
                    outdent`
                if (!isPlatformBrowser(this.platformId)) {
                    const bases = this.document.getElementsByTagName('base');

                    if (bases.length > 0) {
                        bases[0].setAttribute('href', environment.baseHref);
                    }
                }`,
            );
        } else {
            addMethod(
                tree,
                appComponentFilePath,
                outdent`
                public ngOnInit(): void {
                    if (!isPlatformBrowser(this.platformId)) {
                        const bases = this.document.getElementsByTagName('base');
                
                        if (bases.length > 0) {
                            bases[0].setAttribute('href', environment.baseHref);
                        }
                    }
                }`,
            );
        }
        return tree;
    };
}
