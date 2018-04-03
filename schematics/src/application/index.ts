import {
    apply,
    chain, externalSchematic, MergeStrategy,
    mergeWith, move, Rule, template, url
} from '@angular-devkit/schematics';

export function application(options: any): Rule {
    const templateSource = apply(url('./files'), [
        template({...options}),
        move(options.directory)
    ])

  return chain([
        externalSchematic('@schematics/angular', 'application', options),
          mergeWith(templateSource, MergeStrategy.Overwrite)
      ]);
}
