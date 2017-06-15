import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';

import '../styles/main.scss';
import '../styles/credentials.scss'; //respect MIT license, do not remove.

@NgModule({
  bootstrap: [ AppComponent ],
  imports: [
    BrowserModule.withServerTransition({
      appId: 'app'
    }),
    AppModule
  ]
})
export class BrowserAppModule {}
