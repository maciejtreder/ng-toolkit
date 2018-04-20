import {
    apply,
    chain, externalSchematic, MergeStrategy,
    mergeWith, move, Rule, SchematicContext, template, Tree, url
} from '@angular-devkit/schematics';

import { Observable, Subscriber } from 'rxjs/index';
import { getFileContent } from '@schematics/angular/utility/test';

export function application(options: any): Rule {
    const templateSource = apply(url('./files'), [
        template({...options}),
        move(options.directory)
    ])

  return chain([
      updateCLI(options),
          mergeWith(templateSource, MergeStrategy.Overwrite),

    ]);
}


function updateCLI(options: any): Rule {
    return (tree: Tree, _context: SchematicContext) => {
        return Observable.create((subscriber: Subscriber<Tree>) => {

        const defaultRule: Rule = externalSchematic('@schematics/angular', 'application', options);

            (defaultRule(tree, _context) as Observable<Tree>).subscribe(tree => {

                const configSource = JSON.parse(getFileContent(tree, `${options.directory}/.angular-cli.json`));

                const devApp = configSource.apps.splice(0, 1)[0];
                const prodBrowser = JSON.parse(JSON.stringify(devApp));
                const prodServer = JSON.parse(JSON.stringify(devApp));

                configSource.apps.splice(0, 1);

                devApp.serviceWorker = true;
                devApp.outDir = `dist/browser`;
                devApp.assets.push({glob: "**/*", input: "../firebug-lite", output: "./firebug-lite"})
                devApp.assets.push({glob: "ngsw-worker.js", input: "./", output: "./ngsw-worker.js"})
                devApp.main = "main.browser.ts";
                devApp.styles = ["styles/main.scss"];
                devApp.environments = {
                    dev: "environments/environment.ts",
                    firebug: "environments/environment.firebug.ts",
                }

                prodBrowser.serviceWorker = true;
                prodBrowser.outDir = `dist/browser`;
                prodBrowser.assets.push('manifest.json')
                prodBrowser.main = "main.browser.ts";
                prodBrowser.styles = ["styles/main.scss"];
                prodBrowser.environments = {
                    prod: "environments/environment.prod.ts"
                }

                prodServer.outDir = `dist/server`;
                prodServer.assets.push('manifest.json')
                prodServer.main = "main.server.ts";
                prodServer.platform = "server";
                prodServer.tsconfig = "tsconfig.server.json";
                prodServer.styles = ["styles/main.scss"];
                prodServer.polyfills = null;
                prodServer.environments = {
                    prod: "environments/environment.prod.ts"
                }

                configSource.apps.push(devApp);
                configSource.apps.push(prodBrowser);
                configSource.apps.push(prodServer);

                tree.overwrite(`${options.directory}/.angular-cli.json`, JSON.stringify(configSource, null, "  "));

                subscriber.next(tree);
                subscriber.complete();
            });
        });
    }
}