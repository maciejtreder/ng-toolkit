import {
    Rule, externalSchematic, chain,
    move, apply, url, mergeWith, MergeStrategy
} from '@angular-devkit/schematics';
import { createGitIgnore, createOrOverwriteFile, getSource } from '../utils/index';
import { addServerless } from '../utils/serverless/index';

export default function (options: any): Rule {
    if (!options.directory) {
        options.directory = options.name;
    }
    const templateSource = apply(url('../application/files'), [
        move(options.directory),
    ]);

    return chain([
        externalSchematic('@schematics/angular', 'ng-new', options),
        (tree => {
            tree.rename(`${options.directory}/src/main.ts`, `${options.directory}/src/main.browser.ts`);
            return tree;
        }),
        mergeWith(templateSource, MergeStrategy.Overwrite),
        createGitIgnore(options.directory),
        adjustCLIConfig(options),
        updatePackageJson(options),
        addServerless(options)
    ]);
}

function updatePackageJson(options: any): Rule {
    return tree => {
        let packageJsonContent = getSource(tree, `${options.directory}/package.json`);
        packageJsonContent = packageJsonContent.replace('__projectName__', options.name);
        createOrOverwriteFile(tree, `${options.directory}/package.json`, packageJsonContent);
        return tree;
    }
}

function adjustCLIConfig(options: any): Rule {
    return tree => {
        const cliConfig = JSON.parse(getSource(tree, `${options.directory}/angular.json`))
        cliConfig.projects[options.name].architect.build.options.outputPath = 'dist/browser';
        cliConfig.projects[options.name].architect.build.options.main = 'src/main.browser.ts';
        cliConfig.projects[options.name].architect.build.options.assets.push({glob: "manifest.json", input: "src", output: "/"});
        cliConfig.projects[options.name].architect.build.options.assets.push({glob: "ngsw-worker.js", input: "src/assets/fakeSW", output: "/"});
        cliConfig.projects[options.name].architect.build.options.styles = [{input: "src/styles/main.scss"}];
        cliConfig.projects[options.name].architect.build.configurations.production.serviceWorker = true;


        cliConfig.projects[options.name].architect.serve.configurations.dev = {browserTarget: `${options.name}:build:dev`};
        delete cliConfig.projects[options.name].architect.serve.configurations.production;

        cliConfig.projects[options.name].architect.test.options.assets.push({glob: "manifest.json", input: "src", output: "/"});
        cliConfig.projects[options.name].architect.test.options.styles = [{input: "src/styles/main.scss"}];

        cliConfig.projects[options.name].architect.server = {
            builder: '@angular-devkit/build-angular:server',
            options: {
                outputPath: 'dist/server',
                main: 'src/main.server.ts',
                tsConfig: 'src/tsconfig.server.json'
            }
        };

        cliConfig.projects[`${options.name}-e2e`].architect.e2e.options.devServerTarget = `${options.name}:serve`;

        createOrOverwriteFile(tree, `${options.directory}/angular.json`, JSON.stringify(cliConfig, null, "  "));
        return tree;
    }
}
