import {
    Rule, externalSchematic, chain,
    move, apply, url, mergeWith, MergeStrategy, asSource
} from '@angular-devkit/schematics';
import { empty } from '@angular-devkit/schematics/src/tree/static';

export default function (options: any): Rule {
    if (!options.directory) {
        options.directory = options.name;
    }
    const templateSource = apply(url('../application/files'), [
        move(options.directory)
    ]);

    const angularCLIConfig = apply(url('./files'), [
        move(options.directory)
    ]);

    return chain([
        chain([
            mergeWith(templateSource, MergeStrategy.Overwrite),
            mergeWith(angularCLIConfig, MergeStrategy.Overwrite),
            ]),
        mergeWith(apply(asSource(externalSchematic('@schematics/angular', 'ng-new', options)), [removeRedundantFiles()]), MergeStrategy.Overwrite)
        // removeRedundantFiles(options)
    ]);
}

function removeRedundantFiles():Rule {
    return empty;
    // return (tree: Tree, _context: SchematicContext) => {
    //     console.log(tree.getDir(`./${options.directory}/src`).subfiles);
    //     tree.delete(`./${options.directory}/src/karma.conf.js`);
    //     tree.delete(`./${options.directory}/src/main.ts`);
    //     tree.delete(`./${options.directory}/src/tslint.json`);
    //     tree.delete(`./${options.directory}/src/browserslist`);
    //
    //     console.log(tree.getDir(`./${options.directory}/src`).subfiles);
    //     // return tree;
    // }
}
