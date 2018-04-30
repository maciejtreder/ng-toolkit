import { googleAnalytics } from './bootstrapScripts';
import { fireBug } from './bootstrapScripts';
import { enableProdMode } from '@angular/core';
    import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

    import { environment } from './environments/environment';
    import { AppBrowserModule } from './app/app.browser.module';

    if (environment.production) {
        enableProdMode();
    }

    fireBug().then(() => platformBrowserDynamic().bootstrapModule(AppBrowserModule));
    googleAnalytics();
