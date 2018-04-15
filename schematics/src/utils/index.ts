import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';

export function getSource(tree: Tree, filePath: string): string {
    const text = tree.read(filePath);

    if (text == null) {
        throw new SchematicsException(`File ${filePath} does not exist.`);
    }

    return text.toString('utf-8');
}

export function createGitIgnore(dirName: string): Rule {
    return (tree => {
        tree.create(`./${dirName}/.gitignore`, `
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
serverless.yml
/coverage`);
        return tree;
    });
}