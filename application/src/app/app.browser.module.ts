import { NgModule } from '@angular/core';
import { BrowserModule, BrowserTransferStateModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http);
}

@NgModule({
    bootstrap: [ AppComponent ],
    imports: [
        BrowserAnimationsModule,
        BrowserModule.withServerTransition({
            appId: 'app-root'
        }),
        AppModule,
        ServiceWorkerModule.register('/ngsw-worker.js'),
        HttpClientModule,
        TranslateModule.forRoot({
            loader: {provide: TranslateLoader, useFactory: HttpLoaderFactory, deps: [HttpClient]}
        }),
        BrowserTransferStateModule
    ]
})
export class AppBrowserModule {}
