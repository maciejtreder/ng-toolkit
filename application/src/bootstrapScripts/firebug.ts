import { environment } from '../environments/environment';

export const fireBug = () =>  new Promise((resolve) => {
    if (environment.firebug) {
        const fb = document.createElement('script');
        fb.type = 'text/javascript'; fb.src = '../firebug-lite/build/firebug-lite.js';
        fb.innerHTML = `
        {
            overrideConsole: true,
            startOpened: true,
            enableTrace: false
        }
        `;
        document.head.appendChild(fb);
        const interval = setInterval(() => {
            console.log('interval');
            if (!!document.getElementById('FirebugUI')) {
                clearInterval(interval);
                resolve();
            }
        }, 1);
    } else {
        resolve();
    }
});
