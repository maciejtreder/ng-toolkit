import { ApplicationRef } from '@angular/core';
import { enableDebugTools } from '@angular/platform-browser';

declare var FIREBUG: boolean;

export const googleAnalytics = () => {
    if (process.env.NODE_ENV === 'production') {

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
    }
};

export const decorateModuleRef = (modRef: any) => {
    const appRef = modRef.injector.get(ApplicationRef);
    const cmpRef = appRef.components[0];

    const _ng = (window as any).ng;
    enableDebugTools(cmpRef);
    (window as any).ng.probe = _ng.probe;
    (window as any).ng.coreTokens = _ng.coreTokens;
    return modRef;
};

export const fireBug = new Promise((resolve) => {
    if (!!FIREBUG) {
        const fb = document.createElement('script');
        fb.type = 'text/javascript'; fb.src = '../firebug-lite/build/firebug-lite.js#startOpened,overrideConsole=false';
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
