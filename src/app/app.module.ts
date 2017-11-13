import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule, MatSidenavModule, MatSnackBarModule, MatToolbarModule } from '@angular/material';
import { ServiceWorkerModule } from '@angular/service-worker';

import { SnackBarService } from './services/snack-bar.service';
import { DeviceService } from './services/device.service';
import { ReTree } from './services/retree.service';
import { WindowRef } from './windowRef';

import { AppComponent } from './app.component';
import { MenuComponent } from './menu.component';
import { HomeComponent } from './home/home.component';
import { NotificationService } from './services/notification.service';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  imports: [
      MatButtonModule,
      MatToolbarModule,
      MatSnackBarModule,
      MatSidenavModule,
      ServiceWorkerModule,
      HttpClientModule,
    CommonModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent},
      { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule'},
      { path: 'httpProxy', loadChildren: './httpProxy/http-proxy.module#HttpProxyModule'},
      { path: 'external', loadChildren: '@angular-universal-serverless/external-module/release#ExternalModule'}
    ]),
    ServiceWorkerModule
  ],
  declarations: [ AppComponent, HomeComponent, MenuComponent ],
  exports: [ AppComponent ],
  providers: [
    WindowRef,
    SnackBarService,
    NotificationService,
    DeviceService,
    ReTree
  ]
})
export class AppModule {
}
