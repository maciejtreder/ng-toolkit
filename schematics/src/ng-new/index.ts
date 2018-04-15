import { Rule, externalSchematic, chain, move, apply, url, mergeWith, MergeStrategy } from '@angular-devkit/schematics';

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
        externalSchematic('@schematics/angular', 'ng-new', options),
        mergeWith(templateSource, MergeStrategy.Overwrite),
        mergeWith(angularCLIConfig, MergeStrategy.Overwrite)
    ]);
}
