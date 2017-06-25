import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { HttpModule } from '@angular/http';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { HomeView } from './home/home-view.component';
import { HttpIndexedService } from './http-indexed-service';
import { SnackBarService } from './services/snack-bar.service';

import { MdButtonModule, MdSnackBarModule } from '@angular/material';

import { ServiceWorkerModule } from '@angular/service-worker';

@NgModule({
  imports: [
    MdButtonModule,
    MdSnackBarModule,
    CommonModule,
    HttpModule,
    RouterModule.forRoot([
      { path: '', component: HomeView, pathMatch: 'full'},
      { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule'}
    ]),
    ServiceWorkerModule
  ],
  declarations: [ AppComponent, HomeView ],
  exports: [ AppComponent ],
  providers: [HttpIndexedService, SnackBarService]
})
export class AppModule {
}
