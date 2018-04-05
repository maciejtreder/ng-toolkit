import { SchematicsException, Tree } from '@angular-devkit/schematics';

export function getSource(tree: Tree, filePath: string): string {
    const text = tree.read(filePath);

    if (text == null) {
        throw new SchematicsException(`File ${filePath} does not exist.`);
    }

    return text.toString('utf-8');
}