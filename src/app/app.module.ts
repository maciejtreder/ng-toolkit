import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { HttpModule } from '@angular/http';
import { RouterModule } from '@angular/router';
import { MdButtonModule, MdSnackBarModule, MdSidenavModule } from '@angular/material';
import { ServiceWorkerModule } from '@angular/service-worker';

import { HttpSwProxyModule } from 'ng-http-sw-proxy';
//import { Ng2DeviceDetectorModule } from 'ng2-device-detector';
import { SnackBarService } from './services/snack-bar.service';

import { AppComponent } from './app.component';
import { MenuComponent } from './menu.component';
import { HomeView } from './home/home-view.component';


@NgModule({
  imports: [
    MdButtonModule,
    MdSnackBarModule,
    MdSidenavModule,
    CommonModule,
    HttpSwProxyModule,
    //Ng2DeviceDetectorModule.forRoot(),
    RouterModule.forRoot([
      { path: '', component: HomeView, pathMatch: 'full'},
      { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule'},
      { path: 'httpProxy', loadChildren: './httpProxy/http-proxy-demo.module#HttpProxyDemoModule'}
    ]),
    ServiceWorkerModule
  ],
  declarations: [ AppComponent, HomeView, MenuComponent ],
  exports: [ AppComponent ],
  providers: [SnackBarService]
})
export class AppModule {
}
