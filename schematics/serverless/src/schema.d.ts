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
    provider: ('aws' | 'gcloud' | 'firebase');
    skipInstall: boolean;
    directory: string;
    firebaseProject: string;
    project: string;
    serverless?: IServerless;
    disableBugsnag?: boolean;
}