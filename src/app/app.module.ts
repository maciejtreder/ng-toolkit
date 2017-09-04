import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MdButtonModule, MdSnackBarModule, MdSidenavModule, MdToolbarModule } from '@angular/material';
import { ServiceWorkerModule } from '@angular/service-worker';

import { HttpSwProxyModule } from 'ng-http-sw-proxy';
import { SnackBarService } from './services/snack-bar.service';
import { ServiceWorkerService } from './services/service-worker.service';
import { DeviceService } from './services/device-service';
import { ReTree } from './services/retree.service';

import { AppComponent } from './app.component';
import { MenuComponent } from './menu.component';
import { HomeViewComponent } from './home/home-view.component';

@NgModule({
  imports: [
    MdButtonModule,
    MdToolbarModule,
    MdSnackBarModule,
    MdSidenavModule,
    CommonModule,
    HttpSwProxyModule,
    RouterModule.forRoot([
      { path: '', component: HomeViewComponent, pathMatch: 'full'},
      { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule'},
      { path: 'httpProxy', loadChildren: './httpProxy/http-proxy-demo.module#HttpProxyDemoModule'}
    ]),
    ServiceWorkerModule
  ],
  declarations: [ AppComponent, HomeViewComponent, MenuComponent ],
  exports: [ AppComponent ],
  providers: [SnackBarService, ServiceWorkerService, DeviceService, ReTree]
})
export class AppModule {
}
