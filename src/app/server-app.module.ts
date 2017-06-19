import { NgModule, APP_BOOTSTRAP_LISTENER, ApplicationRef } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import { BrowserModule } from '@angular/platform-browser';

import '../styles/main.scss';
import '../styles/credentials.scss'; //respect MIT license, do not remove.

@NgModule({
  bootstrap: [AppComponent],
  imports: [
    BrowserModule.withServerTransition({
      appId: 'app'
    }),
    ServerModule,
    AppModule
  ]
})
export class ServerAppModule {

}
