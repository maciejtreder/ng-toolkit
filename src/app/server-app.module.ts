import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import { BrowserModule } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModuleMock } from './services/service-worker.mock.module';

@NgModule({
  bootstrap: [AppComponent],
  imports: [
    BrowserModule.withServerTransition({
      appId: 'app'
    }),
    ServerModule,
      NoopAnimationsModule,
    AppModule,
      ServiceWorkerModuleMock
  ]
})
export class ServerAppModule {}
