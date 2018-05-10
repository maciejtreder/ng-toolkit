import {
    apply, chain, mergeWith, move, Rule, SchematicsException, Tree, url, MergeStrategy, SchematicContext
} from '@angular-devkit/schematics';
import {
    addDependencyToPackageJson, addOrReplaceScriptInPackageJson,
    createOrOverwriteFile
} from '@angular-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

export default function addServerless(options: any): Rule {
    options.serverless = {
        aws: {},
        gcloud: {}
    };
    options.directory = '.';

    const templateSource = apply(url('files/common'), [
        move(options.directory),
    ]);


    const rules: Rule[] = [];
    rules.push(mergeWith(templateSource, MergeStrategy.Overwrite));

    rules.push(addOrReplaceScriptInPackageJson(options,"deploy", "serverless deploy"));
    rules.push(addOrReplaceScriptInPackageJson(options,"build:prod", "npm run build && webpack --config webpack.server.config.js --progress --colors"));
    rules.push(addOrReplaceScriptInPackageJson(options,"build:deploy", "npm run build:prod && npm run deploy"));

    rules.push(addDependencyToPackageJson(options, 'serverless', '1.26.1', true));
    rules.push(addDependencyToPackageJson(options, 'ts-loader', '4.2.0', true));
    rules.push(addDependencyToPackageJson(options, 'webpack-cli', '2.1.2', true));

    if (options.provider === 'gcloud') {
        rules.push(addServerlessGcloud(options));
    } else if (options.provider === 'aws') {
        rules.push(addServerlessAWS(options));
    } else {
        options.serverless.aws.filename = 'serverless-aws.yml';
        options.serverless.gcloud.filename = 'serverless-gcloud.yml';
        rules.push(addServerlessAWS(options));
        rules.push(addServerlessGcloud(options));
        rules.push((tree: Tree, context: SchematicContext) => {
            //add scripts to package.json
            const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
            delete packageJsonSource.scripts['build:deploy'];

            packageJsonSource.scripts['build:deploy:aws'] = 'npm run build:prod && npm run deploy:aws';
            packageJsonSource.scripts['build:deploy:gcloud'] = 'npm run build:prod && npm run deploy:gcloud';
            packageJsonSource.scripts['deploy:aws'] = 'cp-cli serverless-aws.yml serverless.yml && npm run deploy';
            packageJsonSource.scripts['deploy:gcloud'] = 'cp-cli serverless-gcloud.yml serverless.yml && npm run deploy';

            tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, "  "));

            context.addTask(new NodePackageInstallTask(options.directory));

            return tree;
        });
    }

    rules.push(tree => {
        const universal:boolean = isUniversal(tree, options);
        if(universal) {
            // noop
        } else {
            serveStaticFiles(tree, getDistFolder(tree, options, universal))
        }
        return tree;
    });


    return chain(rules);
}

function addServerlessAWS(options: any): Rule {
    const fileName = options.serverless.aws.filename || 'serverless.yml';

    const source = apply(url('./files/aws'), [
        move(options.directory)
    ]);

    return chain([
        mergeWith(source),
        tree => {
            tree.rename(`${options.directory}/serverless-aws.yml`, `${options.directory}/${fileName}`);
            return tree;
        },

        addDependencyToPackageJson(options, 'aws-serverless-express', '^3.2.0' ),
        addDependencyToPackageJson(options, 'serverless-apigw-binary', '^0.4.4', true )
    ]);
}

function addServerlessGcloud(options: any): Rule {
    const fileName = options.serverless.gcloud.filename || 'serverless.yml';

    const source = apply(url('./files/gcloud'), [
        move(options.directory)
    ]);

    return chain([
        mergeWith(source),
        tree => {
            tree.rename(`${options.directory}/serverless-gcloud.yml`, `${options.directory}/${fileName}`);
            return tree;
        },

        addDependencyToPackageJson(options, 'firebase-admin', '^5.11.0' ),
        addDependencyToPackageJson(options, 'firebase-functions', '^0.9.1' ),
        addDependencyToPackageJson(options, 'serverless-google-cloudfunctions', '^1.1.1', true )
    ]);
}

function isUniversal(tree: Tree, options: any): boolean {
    const cliConfig: any = JSON.parse(getFileContent(tree, './angular.json'));
    const project: any = cliConfig.projects[options.project].architect;
    for (let property in project) {
        if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:server') {
            return true;
        }
    }
    return false;
}

function serveStaticFiles(tree: Tree, distFolder: string): void {
    createOrOverwriteFile(tree, './server.ts', `import 'zone.js/dist/zone-node';
import 'reflect-metadata';

import * as express from 'express';
import * as cors from 'cors';
import * as compression from 'compression';

import {join} from 'path';

export const app = express();

app.use(compression());
app.use(cors());

const DIST_FOLDER = join(process.cwd(), 'dist/${distFolder}');

app.get('*.*', express.static(join(DIST_FOLDER), {
  maxAge: '1y'
}));

app.get('/*', (req, res) => {
        res.sendFile(join(DIST_FOLDER+'index.html'));
});`);
}

function getDistFolder(tree: Tree, options: any, universal: boolean): string {
    if (universal) {
        return '';
    } else {
        const cliConfig: any = JSON.parse(getFileContent(tree, './angular.json'));
        const project: any = cliConfig.projects[options.project].architect;
        for (let property in project) {
            if (project.hasOwnProperty(property) && project[property].builder === '@angular-devkit/build-angular:browser') {
                return project[property].options.outputPath;
            }
        }
        throw new SchematicsException('browser nor server builder not found!');
    }
}