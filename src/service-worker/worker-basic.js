import {bootstrapServiceWorker} from '@angular/service-worker/worker';
import {Dynamic, FreshnessStrategy, PerformanceStrategy} from '@angular/service-worker/plugins/dynamic';
import {ExternalContentCache} from '@angular/service-worker/plugins/external';
import {RouteRedirection} from '@angular/service-worker/plugins/routes';
import {StaticContentCache} from '@angular/service-worker/plugins/static';
import {Push} from '@angular/service-worker/plugins/push';
import {HttpSwProxyPlugin} from 'ng-http-sw-proxy/dist/plugin';

bootstrapServiceWorker({
    manifestUrl: 'ngsw-manifest.json',
    plugins: [
        StaticContentCache(),
        Dynamic([
            new FreshnessStrategy(),
            new PerformanceStrategy(),
        ]),
        ExternalContentCache(),
        RouteRedirection(),
        Push(),
        HttpSwProxyPlugin()
    ],
});