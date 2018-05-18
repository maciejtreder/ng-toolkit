import { chain, Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { getFileContent } from '@schematics/angular/utility/test';
import { isString } from 'util';

export function createGitIgnore(dirName: string): Rule {
    return (tree => {
        createOrOverwriteFile(tree, `./${dirName}/.gitignore`, `/node_modules/
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
    });
}

export function updateGitIgnore(options: any, entry: string): Rule {
    return tree => {
        const content = getFileContent(tree,`${options.directory}/.gitignore`);
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

export function addDependenciesToPackageJson(options: any, dependencies: {name: string, version:string, dev: boolean}[]): Rule {
    return (tree: Tree) => {
        const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));

        dependencies.forEach(entry => {
            if (!entry.dev) {
                packageJsonSource.dependencies[entry.name] = entry.version;
            }
            if (entry.dev) {
                packageJsonSource.devDependencies[entry.name] = entry.version;
            }
        })

        tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, "  "));

        return tree;
    }
}

export function addDependencyToPackageJson(options: any, name: string, version: string, dev: boolean = false): Rule {
    return (tree: Tree) => {
        const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));

        if (!dev) {
            packageJsonSource.dependencies[name] = version;
        }
        if (dev) {
            packageJsonSource.devDependencies[name] = version;
        }

        tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, "  "));
        return tree;
    }
}

export function addOrReplaceScriptInPackageJson(options: any, name: string, script: string): Rule {
    return tree => {
        const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
        packageJsonSource.scripts[name] = script;
        tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, "  "));
        return tree;
    }
}

export function addEntryToEnvironment(tree: Tree, filePath: string, entryName: string, entryValue: any): void {
    const sourceText = getFileContent(tree, filePath);
    const changePos =  sourceText.lastIndexOf("};") - 1;
    const changeRecorder = tree.beginUpdate(filePath);
    if (isString(entryValue)) {
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

export function addImportStatement(tree: Tree, filePath: string, type: string, file: string ) {
    const fileContent = getFileContent(tree, filePath);
    let results: any = fileContent.match(new RegExp("import.*{.*(" + type + ").*}.*(" + file + ").*"));
    if (results) {
        return;
    }
    results = fileContent.match(new RegExp("import.*{(.*)}.*(" + file + ").*"));
    if (results) {
        let newImport = `import {${results[1]}, ${type}} from '${file}';`;
        tree.overwrite(filePath, fileContent.replace(results[0], newImport));
    } else {
        addImportLine(tree, filePath, `import { ${type} } from '${file}';`)
    }
}

export function implementInterface(tree: Tree, filePath: string, interfaceName: string, fileName: string) {

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
    return chain([
        (tree: Tree) => {
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
        },
        addDependencyToPackageJson(options, 'opencollective', '^1.0.3', true)
    ]);
}

export function updateMethod(tree: Tree, filePath: string, name: string, newBody: string) {
    let fileContent = getFileContent(tree, filePath);
    let oldSignature = getMethodSignature(tree, filePath, name);
    if (oldSignature) {
        const oldBody = getMethodBody(tree, filePath, name) || '';
        let newMethodContent = oldSignature + newBody;
        let oldMethod = oldSignature + oldBody;

        tree.overwrite(filePath, fileContent.replace(oldMethod, newMethodContent));
    } else {
        throw new SchematicsException(`Method ${name} not found in ${filePath}`);
    }
}

export function getMethodSignature(tree: Tree, filePath: string, name: string): string | null {
    let fileContent = getFileContent(tree, filePath);
    let results: any = fileContent.match(new RegExp("(?:public|private|).*" + name + ".*?\\(((\\s.*?)*)\\).*\\s*{"));
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

export function getMethod(tree: Tree, filePath:string, name: string): string | null {
    let fileContent = getFileContent(tree, filePath);
    let results: any = fileContent.match(new RegExp("(?:public|private|).*" + name + ".*?\\(((\\s.*?)*)\\).*\\s*{"));
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

export function getMethodBody(tree: Tree, filePath:string, name: string): string | null {
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
    const changePos =  sourceText.lastIndexOf("}") - 1;
    const changeRecorder = tree.beginUpdate(filePath);
    changeRecorder.insertLeft(changePos, body);
    tree.commitUpdate(changeRecorder);
}

export function addParamterToMethod(tree: Tree, filePath:string, name: string, parameterDeclaration: string) {
    let method = getMethod(tree, filePath, name);
    const fileContent = getFileContent(tree, filePath);
    if (method) {
        let results: any = method.match(new RegExp("((public|private|).*constructor.*?\\()((\\s.*\\s*?)*)\\)\\s*{"));
        if (results) {
            let oldParams = results[3];
            if (oldParams.indexOf(parameterDeclaration) > 0) {
                return;
            }
            let newParams = oldParams + ", " + parameterDeclaration;

            let newMethod = method.replace(oldParams, newParams);

            tree.overwrite(filePath, fileContent.replace(method, newMethod));
        }
    }
}

export function getServerDistFolder(tree: Tree, options: any): string {
    const cliConfig: any = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
    // console.log(getFileContent(tree, `${options.directory}/angular.json`));
    const project: any = cliConfig.projects[options.project].architect;
    for (let property in project) {
        if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:server') {
            return project[property].options.outputPath;
        }
    }
    return '';
}

export function getBrowserDistFolder(tree: Tree, options: any): string {
    const cliConfig: any = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
    const project: any = cliConfig.projects[options.project].architect;
    for (let property in project) {
        if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:browser') {
            return project[property].options.outputPath;
        }
    }
    throw new SchematicsException('browser nor server builder not found!');
}

export function getDistFolder(tree: Tree, options: any): string {
    let toReturn;
    if (isUniversal(tree, options)) {
        let array = [getServerDistFolder(tree, options), getBrowserDistFolder(tree, options)]
        let A = array.concat().sort(),
            a1 = A[0], a2 = A[A.length - 1], L = a1.length, i = 0;
        while (i < L && a1.charAt(i) === a2.charAt(i)) i++;

        toReturn = a1.substring(0, i);
    } else {
        toReturn = getBrowserDistFolder(tree, options).substr(0, getBrowserDistFolder(tree,options).lastIndexOf('/'));
    }
    return toReturn;
}

export function isUniversal(tree: Tree, options: any): boolean {
    const cliConfig: any = JSON.parse(getFileContent(tree, `${options.directory}/angular.json`));
    const project: any = cliConfig.projects[options.project].architect;
    for (let property in project) {
        if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:server') {
            return true;
        }
    }
    return false;
}