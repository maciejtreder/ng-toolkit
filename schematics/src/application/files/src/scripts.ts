import { environment } from './environments/environment';

export const googleAnalytics = () => {
  if (!environment.googleAnalytics || environment.gaTrackingCode.length == 0)
    return;

  const script = document.createElement('script');
  const scriptGA = document.createElement('script');
  scriptGA.setAttribute('src', `https://www.googletagmanager.com/gtag/js?id=${environment.gaTrackingCode}`);
  script.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${environment.gaTrackingCode}');
    `;
  document.body.appendChild(scriptGA);
  document.body.appendChild(script);
};

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
            if (!!document.getElementById('FirebugUI')) {
                clearInterval(interval);
                resolve();
            }
        }, 1);
    } else {
        resolve();
    }
});
