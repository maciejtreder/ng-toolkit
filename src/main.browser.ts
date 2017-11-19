import 'zone.js/dist/zone';
import 'reflect-metadata';
import 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/filter';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/fromPromise';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { ApplicationRef, enableProdMode } from '@angular/core';
import { enableDebugTools } from '@angular/platform-browser';
import { bootloader } from '@angularclass/hmr';
import { BrowserAppModule } from './app/browser-app.module';

if (process.env.NODE_ENV === 'production') {
    enableProdMode();
}

const decorateModuleRef = (modRef: any) => {
    const appRef = modRef.injector.get(ApplicationRef);
    const cmpRef = appRef.components[0];

    const _ng = (window as any).ng;
    enableDebugTools(cmpRef);
    (window as any).ng.probe = _ng.probe;
    (window as any).ng.coreTokens = _ng.coreTokens;
    return modRef;
};

export function main(): Promise<any> {
    return platformBrowserDynamic()
        .bootstrapModule(BrowserAppModule)
        .then(decorateModuleRef)
        .catch((err) => console.error(err));
}

// needed for hmr
// in prod this is replace for document ready
bootloader(main);
