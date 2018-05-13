import {NgModule} from '@angular/core';
import {ServerModule, ServerTransferStateModule} from '@angular/platform-server';
import {ModuleMapLoaderModule} from '@nguniversal/module-map-ngfactory-loader';

import {AppModule} from './app.module';
import {AppComponent} from './app.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import * as fs from 'fs';
import { BrowserModule } from '@angular/platform-browser';
import { ServiceWorkerModuleMock } from './services/service-worker.mock.module';
import { Observable, Observer } from 'rxjs';

export function universalLoader(): TranslateLoader {
    return {
        getTranslation: (lang: string) => {
            return Observable.create((observer: Observer<any>) => {
                observer.next(JSON.parse(fs.readFileSync(`./dist/assets/i18n/${lang}.json`, 'utf8')));
                observer.complete();
            });
        }
    } as TranslateLoader;
}

@NgModule({
    imports: [
        BrowserModule.withServerTransition({
            appId: 'app-root'
        }),
        AppModule,
        ServerModule,
        NoopAnimationsModule,
        ModuleMapLoaderModule,
        ServerTransferStateModule,
        TranslateModule.forRoot({
            loader: {provide: TranslateLoader, useFactory: universalLoader}
        }),
        ServiceWorkerModuleMock
    ],
    bootstrap: [AppComponent],
})
export class AppServerModule {}
