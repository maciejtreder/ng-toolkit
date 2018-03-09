import 'zone.js/dist/zone';
import 'reflect-metadata';
import 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/filter';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/fromPromise';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { bootloader } from '@angularclass/hmr';
import { BrowserAppModule } from './app/browser-app.module';
import { decorateModuleRef, googleAnalytics, fireBug } from './main.browser.shared';

if (process.env.NODE_ENV === 'production') {
    enableProdMode();
}

export function main(): Promise<any> {

    return fireBug.then(() => {
        platformBrowserDynamic()
            .bootstrapModule(BrowserAppModule)
            .then(decorateModuleRef)
            .then(googleAnalytics)
            .catch((err) => console.error(err));
    });
}

// needed for hmr
// in prod this is replace for document ready
bootloader(main);
