/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

interface IFilename {
    filename?: string;
}

interface IServerless {
    aws: IFilename;
    gcloud: IFilename;
}

export interface IServerlessSchema {
    /** Specify serverless provider. */
    provider: ('aws' | 'gcloud' | 'firebase');
    /** Skip installation of dependencies. */
    skipInstall: boolean;
    /** The directory name to create the workspace in." */
    directory: string;
    /** Firebase project id */
    firebaseProject: string;
    /** The name of the project (internal). */
    clientProject: string;
    /** The name of the project (From Angular schema). */
    project: string;
    /** Serverless filename object */
    serverless?: IServerless;
    /** Disable Bugsnag report */
    disableBugsnag?: boolean;
    /** Generate lambda files using Typescript instead of Javascript */
    lambdaTS?: boolean;
    /** Include serverless-offline package for local development */
    offline?: boolean;
}