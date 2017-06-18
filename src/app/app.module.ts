import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { HttpModule } from '@angular/http';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { HomeView } from './home/home-view.component';

import { MdButtonModule } from '@angular/material';

import { NgServiceWorker, ServiceWorkerModule } from '@angular/service-worker';


@NgModule({
  imports: [
    MdButtonModule,
    CommonModule,
    HttpModule,
    RouterModule.forRoot([
      { path: '', component: HomeView, pathMatch: 'full'},
      { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule'}
    ]),
    ServiceWorkerModule
  ],
  declarations: [ AppComponent, HomeView ],
  exports: [ AppComponent ]
})
export class AppModule {
  constructor(private ws: NgServiceWorker) {
    console.log("constructor");
    this.ws.ping().subscribe(value => {
      console.log('ping', value);
    });
    this.ws.checkForUpdate().subscribe(value => {
      console.log("checkForUpdate", value);
    })
    this.ws.log().subscribe(something => {
      console.log(something);
    })
  }
}
