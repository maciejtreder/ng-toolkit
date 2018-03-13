import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import { BrowserModule } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModuleMock } from './services/service-worker.mock.module';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import * as fs from 'fs';

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
  bootstrap: [AppComponent],
  imports: [
    BrowserModule.withServerTransition({
      appId: 'app'
    }),
    ServerModule,
      NoopAnimationsModule,
    AppModule,
      ServiceWorkerModuleMock,
      TranslateModule.forRoot({
          loader: {provide: TranslateLoader, useFactory: universalLoader}
      })
  ]
})
export class ServerAppModule {}
