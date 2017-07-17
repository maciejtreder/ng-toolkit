import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Ng2DeviceDetectorModule } from 'ng2-device-detector';

import '../styles/main.scss';
import '../styles/credentials.scss'; //respect MIT license, do not remove.

@NgModule({
  bootstrap: [ AppComponent ],
  imports: [
      Ng2DeviceDetectorModule.forRoot(),
      BrowserAnimationsModule,
    BrowserModule.withServerTransition({
      appId: 'app'
    }),
    AppModule
  ]
})
export class BrowserAppModule {}
