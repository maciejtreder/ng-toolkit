import { apply, chain, mergeWith, move, Rule, url } from '@angular-devkit/schematics';
import { addDependencyToPackageJson, addOrReplaceScriptInPackageJson } from '../index';
import { getFileContent } from '@schematics/angular/utility/test';


function addServerlessAWS(options: any): Rule {
    const fileName = options.serverless.aws.filename || 'serverless.yml';

    const source = apply(url('../utils/serverless/files/aws'), [
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

    const source = apply(url('../utils/serverless/files/gcloud'), [
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

export function addServerless(options: any): Rule {
    options.serverless = {
        aws: {},
        gcloud: {}
    };
    const rules: Rule[] = [];

    rules.push(addOrReplaceScriptInPackageJson(options,"build:deploy", "npm run build:prod && npm run deploy"));
    rules.push(addOrReplaceScriptInPackageJson(options,"deploy", "serverless deploy"));

    if (options.provider === 'gcloud') {
        rules.push(addServerlessGcloud(options));
    } else if (options.provider === 'aws') {
        rules.push(addServerlessAWS(options));
    } else {
        options.serverless.aws.filename = 'serverless-aws.yml';
        options.serverless.gcloud.filename = 'serverless-gcloud.yml';
        rules.push(addServerlessAWS(options));
        rules.push(addServerlessGcloud(options));
        rules.push(tree => {
            //add scripts to package.json
            const packageJsonSource = JSON.parse(getFileContent(tree, `${options.directory}/package.json`));
            delete packageJsonSource.scripts['build:deploy'];

            packageJsonSource.scripts['build:deploy:aws'] = 'npm run build:prod && npm run deploy:aws';
            packageJsonSource.scripts['build:deploy:gcloud'] = 'npm run build:prod && npm run deploy:gcloud';
            packageJsonSource.scripts['deploy:aws'] = 'cp-cli serverless-aws.yml serverless.yml && npm run deploy';
            packageJsonSource.scripts['deploy:gcloud'] = 'cp-cli serverless-gcloud.yml serverless.yml && npm run deploy';

            tree.overwrite(`${options.directory}/package.json`, JSON.stringify(packageJsonSource, null, "  "));
            return tree;
        });
    }

    return chain(rules);
}