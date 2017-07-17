import { NgModule, APP_BOOTSTRAP_LISTENER, ApplicationRef } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import { BrowserModule } from '@angular/platform-browser';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { Ng2DeviceService } from 'ng2-device-detector';

import '../styles/main.scss';
import '../styles/credentials.scss'; //respect MIT license, do not remove.


/*
TODO workaround for #11
 */
export class DeviceServiceMock extends Ng2DeviceService {
  public getDeviceInfo(): any {
    return {}
  }

  public isMobile() {
    return true;
  }

  public isTablet() {
    return false;
  }

  public isDesktop() {
    return false;
  }
}


@NgModule({
  bootstrap: [AppComponent],
  imports: [
    BrowserModule.withServerTransition({
      appId: 'app'
    }),
    ServerModule,
      NoopAnimationsModule,
    AppModule
  ],
  providers: [
    {
      provide: Ng2DeviceService,
      useClass: DeviceServiceMock
    }
  ]

})
export class ServerAppModule {

}
