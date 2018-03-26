import 'rxjs/Rx';

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { TransferHttpCacheModule } from '@nguniversal/common';
import { TransferStateComponent } from './transfer-state/transfer-state.component';
import { SnackBar } from './services/snack-bar.service';
import { WindowRef } from './window-ref.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatSnackBarModule } from '@angular/material';
import { MenuComponent } from './menu/menu.component';
import { Notifications } from './services/notifications.service';
import { DonorsComponent } from './donors/donors.component';
import { WithTransferStateComponent } from './transfer-state/with-transfer-state.component';
import { WithoutTransferStateComponent } from './transfer-state/without-transfer-state.component';
import { HitWithTransferStateResolver } from './services/resolvers/hitWithTransferState.resolver';
import { HitWithoutTransferStateResolver } from './services/resolvers/hitWithoutTransferState.resolver';
import { ExampleApi } from './services/exampleApi.service';
import { CommonModule } from '@angular/common';

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        TransferStateComponent,
        MenuComponent,
        DonorsComponent,
        WithTransferStateComponent,
        WithoutTransferStateComponent
    ],
    imports: [
        MatButtonModule,
        MatSnackBarModule,
        MatMenuModule,
        TranslateModule.forChild(),
        CommonModule,
        RouterModule.forRoot([
            { path: '', component: HomeComponent, data: {title: 'Home', description: 'Home.'}},
            { path: 'donors', component: DonorsComponent, data: {title: 'Donors', description: 'List of donations.'}},
            { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule', data: {title: 'Lazy module', description: 'Lazy module example.'}},
            // { path: 'external', loadChildren: '@angular-universal-serverless/external-module/release#ExternalModule', data: {title: 'External module', description: 'External module example.'}}, not works because of https://github.com/angular/angular-cli/issues/8284
            { path: 'transferState', data: {title: 'Transfer state (API)', description: 'Angular TransferState example'}, children: [
                { path: '', component: TransferStateComponent, },
                { path: 'with', component: WithTransferStateComponent, resolve: {hits: HitWithTransferStateResolver}},
                { path: 'without', component: WithoutTransferStateComponent, resolve: {hits: HitWithoutTransferStateResolver}}
            ]}
        ]),
        TransferHttpCacheModule,
      ],
      providers: [SnackBar, WindowRef, Notifications, HitWithTransferStateResolver, HitWithoutTransferStateResolver, ExampleApi],
      bootstrap: [AppComponent]
})
export class AppModule { }
