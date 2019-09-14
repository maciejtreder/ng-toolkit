/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface IFirebugSchema {
    /** The name of the project. */
    clientProject: string;
    /** The name of the project (internal). */
    project?: string;
    /** Skip installation of dependencies. */
    skipInstall: boolean;
    /** The directory name to create the workspace in." */
    directory: string;
    disableBugsnag?: boolean;
}