import * as ts from 'typescript';
import { Rule, SchematicsException, Tree, SchematicContext } from '@angular-devkit/schematics';
import { addSymbolToNgModuleMetadata, insertImport } from '@schematics/angular/utility/ast-utils';
import { NodeDependencyType, NodeDependency } from '@schematics/angular/utility/dependencies';
import { WorkspaceSchema, WorkspaceTargets, ProjectType } from '@schematics/angular/utility/workspace-models';
import { InsertChange, NoopChange } from '@schematics/angular/utility/change';
import { getFileContent } from '@schematics/angular/utility/test';
import { Observable, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import outdent from 'outdent';
import bugsnag from '@bugsnag/js';
const jsyaml = require('js-yaml');

export function createGitIgnore(dirName: string): Rule {
    return (tree: Tree) => {
        createOrOverwriteFile(tree, `./${dirName}/.gitignore`, outdent`
            /node_modules/
            /dist/
            /lib/
            /yarn.lock
            *.log
            .idea
            .serverless
            *.iml
            *.js.map
            *.d.ts
            .DS_Store
            dll
            .awcache
            /src/styles/main.css
            /firebug-lite
            firebug-lite.tar.tgz
            /coverage
        `);
        return tree;
    };
}

export function updateGitIgnore(options: any, entry: string): Rule {
    return (tree: Tree) => {
        const content = getFileContent(tree, `${options.directory}/.gitignore`);
        tree.overwrite(`${options.directory}/.gitignore`, `${content}\n${entry}`);
        return tree;
    }
}

export function createOrOverwriteFile(tree: Tree, filePath: string, fileContent: string): void {
    if (!tree.exists(filePath)) {
        tree.create(filePath, '');
    }
    tree.overwrite(filePath, fileContent);
}

export function addDependencyToPackageJson(tree: Tree, options: any, dependency: NodeDependency): void {
    const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
    packageJsonSource[dependency.type][dependency.name] = dependency.version;
    tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, 2));
}

export function addOrReplaceScriptInPackageJson(options: any, name: string, script: string): Rule {
    return (tree: Tree) => {
        addOrReplaceScriptInPackageJson2(tree, options, name, script);
        return tree;
    }
}

export function addEntryToEnvironment(tree: Tree, filePath: string, entryName: string, entryValue: any): void {
    const sourceText = getFileContent(tree, filePath);
    const changePos = sourceText.lastIndexOf("};") - 1;
    const changeRecorder = tree.beginUpdate(filePath);
    if (typeof entryValue === 'string') {
        changeRecorder.insertLeft(changePos, `,\n\t${entryName}: '${entryValue}'`);
    } else {
        changeRecorder.insertLeft(changePos, `,\n\t${entryName}: ${entryValue}`);
    }
    tree.commitUpdate(changeRecorder);
}

export function addImportLine(tree: Tree, filePath: string, importLine: string): void {
    if (getFileContent(tree, filePath).indexOf(importLine) == -1) {
        const changeRecorder = tree.beginUpdate(filePath);
        changeRecorder.insertLeft(0, importLine + '\n');
        tree.commitUpdate(changeRecorder);
    }
}
function getTsSourceFile(tree: Tree, path: string): ts.SourceFile {
    const buffer = tree.read(path);
    if (!buffer) {
        throw new SchematicsException(`Could not read file (${path}).`);
    }
    const content = buffer.toString();
    const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

    return source;
}

export function addImportStatement(tree: Tree, filePath: string, type: string, file: string): void {
    let source = getTsSourceFile(tree, filePath);
    const importChange = insertImport(source, filePath, type, file) as InsertChange;
    if (!(importChange instanceof NoopChange)) {
        const recorder = tree.beginUpdate(filePath);
        recorder.insertLeft(importChange.pos, importChange.toAdd);
        tree.commitUpdate(recorder);
    }
}

export function implementInterface(tree: Tree, filePath: string, interfaceName: string, fileName: string): void {
    let results: any = getFileContent(tree, filePath).match(new RegExp("(.*class)\\s*(.*?)\\s*(:?implements\\s*(.*)|){"));
    if (results) {
        const oldClassDeclaration = results[0];
        let interfaces = results[5] || '';

        if (interfaces.indexOf(interfaceName) == -1) {
            addImportStatement(tree, filePath, interfaceName, fileName);
            if (interfaces.length > 0) {
                interfaces += ',';
            }
            interfaces += interfaceName;
            const newClassDeclaration = `${results[1]} ${results[2]} implements ${interfaces} {`

            tree.overwrite(filePath, getFileContent(tree, filePath).replace(oldClassDeclaration, newClassDeclaration));
        }
    }
}

export function addOpenCollective(options: any): Rule {
    return (tree: Tree) => {
        const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));

        packageJsonSource['collective'] = {
            type: 'opencollective',
            url: 'https://opencollective.com/ng-toolkit'
        };
        if (packageJsonSource.scripts['postinstall'] && packageJsonSource.scripts['postinstall'].indexOf('opencollective') == -1) {
            packageJsonSource.scripts['postinstall'] += ' && opencollective postinstall'
        } else {
            packageJsonSource.scripts['postinstall'] = 'opencollective postinstall'
        }

        addDependencyToPackageJson(tree, options, {
            type: NodeDependencyType.Dev,
            name: 'opencollective',
            version: '^1.0.3'
        });
        return tree;
    }
}

export function updateMethod(tree: Tree, filePath: string, name: string, newBody: string): void {
    let fileContent = getFileContent(tree, filePath);
    let oldSignature = getMethodSignature(tree, filePath, name);
    if (oldSignature) {
        const oldBody = getMethodBody(tree, filePath, name) || '';
        let newMethodContent = oldSignature + newBody;
        let oldMethod = oldSignature + oldBody;

        tree.overwrite(filePath, fileContent.replace(oldMethod, newMethodContent));
    } else {
        throw new NgToolkitException(`Method ${name} not found in ${filePath}`, { fileContent: fileContent });
    }
}

export function getMethodSignature(tree: Tree, filePath: string, name: string): string | null {
    let fileContent = getFileContent(tree, filePath);
    let results: any = fileContent.match(new RegExp("(?:public|private|).*" + name + ".*?\\(([\\s\\S]*?\\))"));
    if (results) {
        fileContent = fileContent.substr(results.index);
        let lines = fileContent.split('\n');
        let endCut = 0;
        let openingBraces = 0;
        for (let line of lines) {
            endCut += line.length + 1

            openingBraces += (line.match(/{/g) || []).length;
            if (openingBraces > 0) {
                break;
            }
        }

        return fileContent.substr(0, endCut);
    } else {
        return null;
    }
}

export function getMethodBodyEdges(tree: Tree, filePath: string, name: string): { start: number, end: number } | null {
    let fileContent = getFileContent(tree, filePath);
    let sourceFile: ts.SourceFile = ts.createSourceFile('temp.ts', fileContent, ts.ScriptTarget.Latest);

    let toReturn = null;
    sourceFile.forEachChild(node => {
        if (ts.isClassDeclaration(node)) {
            let methodFound = false;
            node.members.forEach(node => {
                if (((name === 'constructor' && ts.isConstructorDeclaration(node)) || ts.isMethodDeclaration(node)) && !methodFound) {
                    methodFound = true;
                    if (node.body) {
                        toReturn = { start: fileContent.indexOf('{', node.body.pos) + 1, end: node.body.end - 1 };
                    }
                }
            });
        }
    });
    return toReturn;
}

export function getMethod(tree: Tree, filePath: string, name: string): string | null {
    let fileContent = getFileContent(tree, filePath);
    let results: any = fileContent.match(new RegExp("(?:public|private|).*" + name + ".*?\\(([\\s\\S]*?\\))"));
    if (results) {
        fileContent = fileContent.substr(results.index);
        let lines = fileContent.split('\n');

        let methodLength = 0;
        let openingBraces = 0;
        let closingBraces = 0;
        let openBraces = 0;
        for (let line of lines) {
            methodLength += line.length + 1;

            openingBraces += (line.match(/{/g) || []).length;
            closingBraces += (line.match(/}/g) || []).length;
            openBraces = openingBraces - closingBraces;

            if (openBraces == 0 && openingBraces > 0) {
                break;
            }
        }
        let methodContent = fileContent.substr(0, methodLength);

        return methodContent;
    } else {
        return null;
    }
}

export function getMethodBody(tree: Tree, filePath: string, name: string): string | null {
    let fileContent = getFileContent(tree, filePath);
    let results: any = fileContent.match(new RegExp("(?:public|private|).*" + name + ".*?\\(((\\s.*?)*)\\).*\\s*{"));
    if (results) {
        fileContent = fileContent.substr(results.index);
        let lines = fileContent.split('\n');

        let startCut = 0;
        let methodLength = 0;
        let openingBraces = 0;
        let closingBraces = 0;
        let openBraces = 0;
        for (let line of lines) {
            if (openBraces == 0) {
                startCut += line.length + 1
            } else {
                methodLength += line.length + 1;
            }

            openingBraces += (line.match(/{/g) || []).length;
            closingBraces += (line.match(/}/g) || []).length;
            openBraces = openingBraces - closingBraces;

            if (openBraces == 0 && openingBraces > 0) {
                break;
            }
        }
        let methodContent = fileContent.substr(startCut, methodLength - 2);

        return methodContent;
    } else {
        return null;
    }
}

export function addMethod(tree: Tree, filePath: string, body: string): void {
    const sourceText = getFileContent(tree, filePath);
    let changePos;
    const changeRecorder = tree.beginUpdate(filePath);


    if (body.indexOf('constructor') >= 0 || body.indexOf('public') >= 0) {
        let match = sourceText.match(/(?:export|) class.*?{[\s\S]*?((?:constructor|public|private|)[\w\s]*?\()/);
        if (match) {
            changePos = (match['index'] || 0) + match[0].length - match[1].length;
        } else {
            changePos = sourceText.lastIndexOf("}") - 1;
        }
    } else {
        changePos = sourceText.lastIndexOf("}") - 1;
    }
    changeRecorder.insertLeft(changePos, `\n${body}\n`);
    tree.commitUpdate(changeRecorder);
}

export function addParamterToMethod(tree: Tree, filePath: string, name: string, parameterDeclaration: string): void {
    let method = getMethod(tree, filePath, name);
    const fileContent = getFileContent(tree, filePath);
    if (method) {
        let results: any = method.match(new RegExp("(?:public|private|\\s).*" + name + "[\\s\\S]*?(\([\\s\\S]*?\)[\\s\\S]*?{)"));
        if (results) {
            let oldParams = results[1];
            oldParams = oldParams.substring(1, oldParams.lastIndexOf(")"));
            if (oldParams.indexOf(parameterDeclaration) > 0) {
                return;
            }
            let newParams = parameterDeclaration + ", " + oldParams;

            let newMethod = method.replace(oldParams, newParams);

            tree.overwrite(filePath, fileContent.replace(method, newMethod));
        }
    }
}

export function getServerDistFolder(tree: Tree, options: any): string {
    const cliConfig: WorkspaceSchema = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
    const project: WorkspaceTargets<ProjectType.Application> | undefined = cliConfig.projects[options.clientProject].architect;
    for (let property in project) {
        if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:server') {
            return project[property].options.outputPath;
        }
    }
    return '';
}

export function updateProject(tree: Tree, options: any): void {
    const cliConfig: WorkspaceSchema = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
    const project: WorkspaceTargets<ProjectType.Application> | undefined = cliConfig.projects[options.clientProject].architect;
    for (let property in project) {
        if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:browser') {
            console.log(`\u001B[33mINFO: \u001b[0mProject property is set to '${options.clientProject}'.`);
            return;
        }
    }

    if (project && project.defaultProject) {
        options.clientProject = project.defaultProject;
        console.log(`\u001B[33mINFO: \u001b[0mProject property is set to '${options.clientProject}'.`);
        return;
    }

    // trying with regex - will take first project found with the browser builder
    const angularFileContent: string = getFileContent(tree, `${options.directory}/angular.json`);
    const results: RegExpExecArray | null = /"projects":\s*{[\s\S]*?"(.*)"[\s\S]*@angular-devkit\/build-angular:browser/.exec(angularFileContent);
    if (results) {
        options.clientProject = results[1];
        console.log(`\u001B[33mINFO: \u001b[0mProject property is set to '${options.clientProject}'.`);
    }
}
export function getBrowserDistFolder(tree: Tree, options: any): string {
    const cliConfig: WorkspaceSchema = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
    const project: WorkspaceTargets<ProjectType.Application> | undefined = cliConfig.projects[options.clientProject].architect;
    for (let property in project) {
        if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:browser') {
            return project[property].options.outputPath;
        }
    }

    // Not found for the passed project. Checks the default one
    throw new NgToolkitException('Browser build not found (lack of entry with build-angular:browser builder) in angular.json', { fileContent: cliConfig });
}

export function getDistFolder(tree: Tree, options: any): string {
    let toReturn;
    if (isUniversal(tree, options)) {
        let array = [getServerDistFolder(tree, options), getBrowserDistFolder(tree, options)]
        let A = array.concat().sort(),
            a1 = A[0], a2 = A[A.length - 1], L = a1.length, i = 0;
        while (i < L && a1.charAt(i) === a2.charAt(i)) i++;

        toReturn = a1.substring(0, i - 1);
    } else {
        toReturn = getBrowserDistFolder(tree, options);
        if (toReturn.lastIndexOf('/') >= 0) {
            toReturn = toReturn.substr(0, toReturn.lastIndexOf('/'));
        }
    }
    return toReturn;
}

export function isUniversal(tree: Tree, options: any): boolean {
    const cliConfig: WorkspaceSchema = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
    const project: WorkspaceTargets<ProjectType.Application> | undefined = cliConfig.projects[options.clientProject].architect;
    for (let property in project) {
        if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:server') {
            return true;
        }
    }
    return false;
}

export function getMainServerFilePath(tree: Tree, options: any): string | undefined {
    const cliConfig: WorkspaceSchema = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
    const project: WorkspaceTargets<ProjectType.Application> | undefined = cliConfig.projects[options.clientProject].architect;
    for (let property in project) {
        if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:server') {
            return `${project[property].options.main}`;
        }
    }
    return undefined;
}

export function getMainFilePath(tree: Tree, options: any): string {
    const cliConfig: WorkspaceSchema = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
    const project: WorkspaceTargets<ProjectType.Application> | undefined = cliConfig.projects[options.clientProject].architect;
    for (let property in project) {
        if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:browser') {
            return `${project[property].options.main}`;
        }
    }
    throw new NgToolkitException('Main file could not be found (lack of entry with build-angular:browser builder) in angular.json', { workspace: cliConfig });
}

export function getAppEntryModule(tree: Tree, options: any): { moduleName: string, filePath: string } {
    const mainFilePath = getMainFilePath(tree, options);
    const entryFileSource: string = getFileContent(tree, `${options.directory}/${mainFilePath}`);

    let results = entryFileSource.match(/bootstrapModule\((.*?)\)/);
    if (!results) {
        throw new NgToolkitException(`Entry module not found in ${options.directory}/${mainFilePath}.`, { fileContent: entryFileSource });
    }

    const entryModule = results[1];
    results = entryFileSource.match(new RegExp(`import\\s*{\\s*.*${entryModule}.*from\\s*(?:'|")(.*)(?:'|")`));
    if (!results) {
        throw new NgToolkitException(`Entry module import not found in ${options.directory}/${mainFilePath}.`, { fileContent: entryFileSource });
    }

    const appModuleFilePath = `${options.directory}/${mainFilePath.substr(0, mainFilePath.lastIndexOf('/'))}/${results[1]}.ts`;

    return { moduleName: entryModule, filePath: appModuleFilePath }
}

export function normalizePath(path: string): string {
    return path.replace(/(([A-z0-9_-]*\/\.\.)|(\/\.))/g, '');
}

export function getRelativePath(from: string, to: string): string {
    from = normalizePath(from);
    to = normalizePath(to);
    let array = [from, to]
    let A = array.concat().sort(),
        a1 = A[0], a2 = A[A.length - 1], L = a1.length, i = 0;
    while (i < L && a1.charAt(i) === a2.charAt(i)) i++;

    let commonBeggining = a1.substring(0, i);
    commonBeggining = commonBeggining.substring(0, commonBeggining.lastIndexOf('/') + 1);

    let navigateFromDirectory = from.replace(commonBeggining, '').replace(/[A-Za-z0-9_-]*\..*/, '').replace(/[A-Za-z0-9_-]*\//, '../');

    let toReturn = `${navigateFromDirectory}${to.replace(commonBeggining, '')}`;
    toReturn = toReturn.substring(0, toReturn.lastIndexOf('.'));
    toReturn = toReturn.startsWith('.') ? toReturn : `./${toReturn}`;
    return toReturn;
}

export function getDecoratorSettings(tree: Tree, filePath: string, decorator: string): ts.Node {
    const fileContent = getFileContent(tree, filePath);
    let sourceFile: ts.SourceFile = ts.createSourceFile('temp.ts', fileContent, ts.ScriptTarget.Latest);

    let toReturn: ts.Node | undefined;

    sourceFile.getChildren().forEach(node => {
        node.getChildren().filter(node => ts.isClassDeclaration(node)).forEach((node: ts.Node) => {
            if (node.decorators) {
                node.forEachChild(node => node.forEachChild(decoratorNode => {
                    if (decoratorNode.kind === ts.SyntaxKind.CallExpression) {
                        decoratorNode.forEachChild(node => {
                            if (ts.isIdentifier(node) && node.escapedText === decorator) {
                                toReturn = decoratorNode;
                            }
                        })
                    }
                }))
            }
        });
    });
    if (toReturn) {
        return toReturn;
    }
    throw new NgToolkitException(`Can't find decorator ${decorator} in ${filePath}`, { fileContent: fileContent });
}

export function getNgToolkitInfo(tree: Tree, options: any): any {
    if (!tree.exists(`${options.directory}/ng-toolkit.json`)) {
        tree.create(`${options.directory}/ng-toolkit.json`, `{}`);
    }
    return JSON.parse(getFileContent(tree, `${options.directory}/ng-toolkit.json`));
}

export function updateNgToolkitInfo(tree: Tree, newSettings: any, options: any): void {
    tree.overwrite(`${options.directory}/ng-toolkit.json`, JSON.stringify(newSettings, null, 2));
}

export function applyAndLog(rule: Rule, bugsnagClient: any): Rule {
    return (tree: Tree, context: SchematicContext) => {
        return (<Observable<Tree>>rule(tree, context))
            .pipe(catchError((error: any) => {
                let subject: Subject<Tree> = new Subject();
                console.log(`\u001B[31mERROR MESSAGE: \u001b[0m${error.message}`);
                console.log(`\u001B[31mERROR STACKTRACE: \u001b[0m${error.stack}`);
                console.log(`\u001B[31mERROR TIP: \u001b[0mIf you think that this error shouldn't occur, please fill up bug report here: \u001B[32mhttps://github.com/maciejtreder/ng-toolkit/issues/new`);
                bugsnagClient.notify(error, {}, (error: any, report: any) => {
                    if (!error && report.errorMessage) {
                        console.log(`\u001B[33mINFO: \u001b[0mstacktrace has been sent to tracking system.`);
                    }
                    subject.next(Tree.empty());
                    subject.complete();
                });
                return subject;
            }))
    }
}

export function checkCLIcompatibility(tree: Tree, options: any): boolean {
    if (!tree.exists(`${options.directory}/angular.json`)) {
        throw new NgToolkitException('@ng-toolkit works only with CLI version 6 or higher. Update your Angular CLI and/or project.');
    }
    return true;
}

export function addToNgModule(tree: Tree, filePath: string, literal: string, entry: string) {
    let source = getTsSourceFile(tree, filePath);
    const changes = addSymbolToNgModuleMetadata(source, filePath, literal, entry);
    if (changes) {
        const recorder = tree.beginUpdate(filePath);
        changes.forEach((change: InsertChange) => {
            recorder.insertRight(change.pos, change.toAdd);
        });
        tree.commitUpdate(recorder);
    }
}

export function removeFromNgModule(tree: Tree, filePath: string, literal: string, entry?: string) {
    let fileContent = getFileContent(tree, filePath);
    const ngModuleDecorator: ts.Node = getDecoratorSettings(tree, filePath, 'NgModule');

    let literalNode: ts.Node = getLiteral(ngModuleDecorator, literal);

    if (!literalNode) {
        throw new SchematicsException(`Literal: ${literal} not found in ${filePath}`);
    }

    literalNode.forEachChild(node => {
        if (ts.isArrayLiteralExpression(node)) {
            let actualLiteral;
            let newLiteral = '';
            actualLiteral = fileContent.substr(literalNode.pos, literalNode.end - literalNode.pos + 1);
            if (entry) {
                newLiteral = actualLiteral.replace(new RegExp(`${entry.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}([\s]*?,|)`), '');
            } else {
                newLiteral = '';
            }
            const newFileContent = fileContent.replace(actualLiteral, newLiteral);
            createOrOverwriteFile(tree, filePath, newFileContent)
        }
    })
}

function getLiteral(inputNode: ts.Node, literal: string): ts.Node {
    let toReturn = null;
    inputNode.forEachChild((node: ts.Node) => {
        if (ts.isObjectLiteralExpression(node)) {
            node.forEachChild(parentNode => {
                if (ts.isPropertyAssignment(parentNode)) {
                    parentNode.forEachChild(node => {
                        if (ts.isIdentifier(node) && node.escapedText === literal) {
                            toReturn = parentNode;
                        }
                    });
                }
            });
        }
    });
    if (!toReturn) {
        throw new SchematicsException(`Literal: ${literal} not found!`);
    }
    return toReturn;
}

export function findStatements(tree: Tree, node: ts.Node, filePath: string, subject: string, replacement: string, toReplace: any[]): void {
    let fileContent = getFileContent(tree, filePath);
    node.forEachChild(node => {
        if (ts.isIdentifier(node)) {
            let statement = fileContent.substr(node.pos, node.end - node.pos);
            let index = statement.indexOf(subject);
            if (index >= 0) {
                toReplace.push({ key: replacement, start: node.pos + index, end: node.end });
            }
        }
        else {
            findStatements(tree, node, filePath, subject, replacement, toReplace);
        }
    });
}

export function updateCode(tree: Tree, filePath: string, varName: string): void {
    let fileContent = getFileContent(tree, filePath);
    let sourceFile: ts.SourceFile = ts.createSourceFile('temp.ts', fileContent, ts.ScriptTarget.Latest);

    sourceFile.forEachChild(node => {
        if (ts.isClassDeclaration(node)) {
            let replacementTable: any[] = [];
            node.members.forEach(node => {
                if (ts.isMethodDeclaration(node)) {
                    (node.body as ts.Block).statements.forEach(statement => {
                        findStatements(tree, statement, filePath, varName, `this.${varName}`, replacementTable);
                    })
                }
            });
            replacementTable.reverse().forEach(element => {
                fileContent = fileContent.substr(0, element.start) + element.key + fileContent.substr(element.end);
            });
            createOrOverwriteFile(tree, filePath, fileContent);
        }
    });
}

export function updateBoostrapFirebug(tree: Tree, options: any) {
    let mainFilePath = `${getMainFilePath(tree, options)}`;
    let mainFileContent = getFileContent(tree, mainFilePath);
    let sourceFile: ts.SourceFile = ts.createSourceFile('temp.ts', mainFileContent, ts.ScriptTarget.Latest);

    sourceFile.forEachChild(node => {
        if (ts.isExpressionStatement(node)) {
            let expression = mainFileContent.substring(node.pos, node.end);
            if (expression.indexOf('bootstrapModule') > -1) {
                //should be wrapped!
                mainFileContent = mainFileContent.substr(0, node.pos) + `\nfireBug().then(() => { \n ${expression} \n});` + mainFileContent.substr(node.end);
                createOrOverwriteFile(tree, mainFilePath, mainFileContent);
                addImportLine(tree, mainFilePath, `import { fireBug } from './bootstrapScripts/firebug';`);
            }
        }
    });
}

export function getBootStrapComponent(tree: Tree, modulePath: string): { component: string, appId: string, filePath: string }[] {
    const moduleSource = getFileContent(tree, modulePath);
    let components: string[] = [];
    let toReturn: any[] = [];
    let decorator: ts.Node = getDecoratorSettings(tree, modulePath, 'NgModule');
    let bootstrapNode = getLiteral(decorator, 'bootstrap');

    if (!bootstrapNode) {
        throw new NgToolkitException(`Bootstrap not found in ${modulePath}.`, { fileContent: moduleSource });
    }

    bootstrapNode.forEachChild(node => {
        if (ts.isArrayLiteralExpression(node)) {
            node.elements.forEach((elem: ts.Identifier) => {
                components.push(elem.escapedText.toString());
            });
        }
    });

    let sourceFile: ts.SourceFile = ts.createSourceFile('temp.ts', moduleSource, ts.ScriptTarget.Latest);

    sourceFile.forEachChild(node => {
        if (ts.isImportDeclaration(node) && node.importClause && node.importClause.namedBindings) {
            let imports = moduleSource.substr(node.importClause.namedBindings.pos, node.importClause.namedBindings.end - node.importClause.namedBindings.pos);
            for (let component of components) {
                if (imports.indexOf(component) > -1 && ts.isStringLiteral(node.moduleSpecifier)) {
                    let componentPath = normalizePath(`${modulePath.substring(0, modulePath.lastIndexOf('/'))}/${node.moduleSpecifier.text}.ts`);
                    let componentDecorator: ts.Node = getDecoratorSettings(tree, componentPath, 'Component');
                    let appId;
                    componentDecorator.forEachChild(node => node.forEachChild(node => {
                        if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.escapedText === 'selector') {
                            appId = (node.initializer as ts.StringLiteral).text;
                        }
                    }));
                    let path = `${modulePath.substring(0, modulePath.lastIndexOf('/'))}/${node.moduleSpecifier.text}.ts`;
                    path = normalizePath(path);
                    toReturn.push({ component: component, appId: appId, filePath: path })
                    break;
                }
            }
        }
    });

    return toReturn;
}

export class NgToolkitException extends SchematicsException {
    constructor(message: string, additionalData?: any) {
        super(message);
        const bugsnagClient = bugsnag('0b326fddc255310e516875c9874fed91');
        bugsnagClient.config.beforeSend = (report): void => {
            report.metaData = { subsystem: additionalData };
        }
    }
}

export function addDependencyInjection(tree: Tree, filePath: string, varName: string, type: string, importFrom: string, token?: string): string {
    if (token) {
        addImportStatement(tree, filePath, token, importFrom);
        addImportStatement(tree, filePath, 'Inject', '@angular/core');
    } else {
        addImportStatement(tree, filePath, type, importFrom);
    }

    let fileContent = getFileContent(tree, filePath);
    let sourceFile: ts.SourceFile = ts.createSourceFile('temp.ts', fileContent, ts.ScriptTarget.Latest);
    let paramName: string | undefined;

    sourceFile.forEachChild(node => {
        if (ts.isClassDeclaration(node)) {
            let methodFound = false;
            let constructorFound: boolean = false;
            let firstMethodPosition = node.end - 1;
            let toAdd = `private ${varName}: ${type}`;
            if (token) {
                toAdd = `@Inject(${token}) ${toAdd}`;
            }
            node.members.forEach(node => {
                if (ts.isMethodDeclaration(node) && !methodFound) {
                    methodFound = true;
                    firstMethodPosition = node.pos;
                }
                if (ts.isConstructorDeclaration(node)) {
                    let regex: string;
                    if (token) {
                        regex = `@Inject\\(\\s*?${token}\\s*?\\)\\s*?(?:private|public)(.*)?:`;
                    } else {
                        regex = `(?:private|public)(.*):\\s?${type}`;
                    }
                    const compiledRegex = new RegExp(regex);
                    node.parameters.forEach(param => {
                        let parameterContent = fileContent.substring(param.pos, param.end);
                        let match = parameterContent.match(compiledRegex);
                        if (match) {
                            paramName = match[1].trim();
                        }
                    });
                    constructorFound = true;
                }
            });

            if (!paramName) {
                paramName = varName;
            }
            if (constructorFound) {
                fileContent = fileContent.replace('constructor(', `constructor(${toAdd}, `);
            } else {
                fileContent = fileContent.substr(0, firstMethodPosition) + `\n constructor(${toAdd}) {}\n` + fileContent.substr(firstMethodPosition);
            }
        }
    });
    createOrOverwriteFile(tree, filePath, fileContent);
    return paramName ? paramName : '';
}

export function addOrReplaceScriptInPackageJson2(tree: Tree, options: any, name: string, script: string): void {
    const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
    packageJsonSource.scripts[name] = script;
    tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, 2));
}

export function getAngularVersion(tree: Tree, options: any): string {
    const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
    return packageJsonSource.dependencies['@angular/core'];
}

export function parseYML2JS(tree: Tree, filePath: string): any {
    const fileContent = getFileContent(tree, filePath);
    try {
        const data = jsyaml.safeLoad(fileContent);
        return data;
    } catch (error) {
        throw new NgToolkitException(`Unable to parse ${filePath} file into JS Object.`, error);
    }
}

export function parseJS2YML(tree: Tree, data: string, outputPath: string) {
    try {
        const fileContent = jsyaml.safeDump(data);
        createOrOverwriteFile(tree, outputPath, fileContent);
    } catch (error) {
        throw new NgToolkitException(`Unable to write parsed JS Object into ${outputPath} file.`, error);
    }
}