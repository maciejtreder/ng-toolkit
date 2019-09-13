/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface IUniversalSchema {
    serverFileName: string;
    serverPort: number;
    skipInstall: boolean;
    directory: string;
    project?: string;
    disableBugsnag?: boolean;
}