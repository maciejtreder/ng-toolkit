/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    projectRoot?: string;
    name: string;
    inlineStyle?: boolean;
    inlineTemplate?: boolean;
    viewEncapsulation?: ('Emulated' | 'Native' | 'None');
    routing?: boolean;
    prefix?: string;
    style?: string;
    skipTests?: boolean;
    skipPackageJson: boolean;
    provider: ('both' | 'aws' | 'gcloud');
    gaTrackingCode?: string;
    firebug: boolean;
}