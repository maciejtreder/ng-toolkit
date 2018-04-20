import { environment } from '../environments/environment';

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
