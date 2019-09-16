/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/** Official ng-universal schema.
 * check it at the [official repo](https://github.com/angular/universal/blob/master/modules/express-engine/schematics/install/schema.json).
 */
export interface IUniversalSchema {
    /** Skip installation of dependencies. */
    skipInstall?: boolean;
    /** The name of the project (internal). */
    clientProject: string;
    /** The appId to use with ServerTransition. */
    appId?: string;
    /** The name of the main entry-point file. */
    main?: string;
    /** The name of the test entry-point file. */
    test?: string;
    /** The name of the Express server file. */
    serverFileName?: string;
    /** The port for the Express server. */
    serverPort?: number;
    /** The name of the TypeScript configuration file. */
    tsconfigFileName?: string;
    /** The name of the TypeScript configuration file for tests. */
    testTsconfigFileName?: string;
    /** The name of the application directory. */
    appDir?: string;
    /** The name of the root module file. */
    rootModuleFileName?: string;
    /** The name of the root module class. */
    rootModuleClassName?: string;
    /** Skip adding Express server file. */
    skipServer?: boolean;
    /** Skip the Angular Universal schematic */
    skipUniversal?: boolean;
    /** Whether to add webpack configuration files. */
    webpack?: boolean;
}

export interface IToolkitUniversalSchema extends IUniversalSchema {
    /** The name of the project (From Angular schema). */
    project: string;
    /** Determines if you want to install TransferHttpCacheModule */
    http?: boolean;
    /** The directory name to create the workspace in. */
    directory: string;
    /** Disable Bugsnag report */
    disableBugsnag?: boolean;
}