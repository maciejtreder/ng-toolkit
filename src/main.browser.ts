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

declare var FIREBUG: boolean;

if (process.env.NODE_ENV === 'production') {
    enableProdMode();

    const script = document.createElement('script');
    const scriptGA = document.createElement('script');
    scriptGA.setAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=UA-109145893-2');
    script.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'UA-109145893-2');
    `;

    document.body.appendChild(scriptGA);
    document.body.appendChild(script);
} else {

    // const fb = document.createElement('script');
    // fb.type = 'text/javascript'; fb.src = 'https://getfirebug.com/firebug-lite.js#startOpened';
    // document.head.appendChild(fb)
    // // document.getElementsByTagName('body')[0].appendChild(fb);
    // setTimeout(() => console.log('test'), 1000);

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
    const fireBugPromise = new Promise((resolve) => {
        if (!!FIREBUG) {
            const fb = document.createElement('script');
            fb.type = 'text/javascript'; fb.src = 'https://getfirebug.com/firebug-lite.js#startOpened';
            document.head.appendChild(fb);
            const interval = setInterval(() => {
                if (!!document.getElementById('FirebugUI')) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1);
        } else {
            resolve();
        }
    });

    return fireBugPromise.then(() => {
        platformBrowserDynamic()
            .bootstrapModule(BrowserAppModule)
            .then(decorateModuleRef)
            .catch((err) => console.error(err));
    });
}

// needed for hmr
// in prod this is replace for document ready
bootloader(main);
