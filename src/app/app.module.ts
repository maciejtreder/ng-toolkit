import { Inject, NgModule } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { MatButtonModule, MatMenuModule, MatSnackBarModule } from '@angular/material';
import { SnackBarService } from './services/snack-bar.service';
import { WindowRef } from './windowRef';
import { AppComponent } from './app.component';
import { MenuComponent } from './menu.component';
import { HomeComponent } from './home/home.component';
import { NotificationService } from './services/notification.service';
import { Meta } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { DonorsComponent } from './donors/donors.component';
import { ExampleApiService } from './services/exampleApi.service';
import { WithTransferStateComponent } from './transferState/withTransferState.component';
import { PingWithTransferStateResolver } from './services/resolvers/pingWithTransferState.resolver';
import { TransferStateComponent } from './transferState/transferState.component';
import { WithoutTransferStateComponent } from './transferState/withoutTransferState.component';
import { PingWithoutTransferStateResolver } from './services/resolvers/pingWithoutTransferState.resolver';
import { CountResolver } from './services/resolvers/count.resolver';

const routes: any[] = [
    { path: '', component: HomeComponent, data: {title: 'Home', description: 'Home.'}},
    { path: 'donors', component: DonorsComponent, data: {title: 'Donors', description: 'List of donations.'}},
    { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule', data: {title: 'Lazy module', description: 'Lazy module example.'}},
    { path: 'external', loadChildren: '@angular-universal-serverless/external-module/release#ExternalModule', data: {title: 'External module', description: 'External module example.'}},
    { path: 'transferState', children: [
        { path: '', component: TransferStateComponent, data: {title: 'Transfer state (API)', description: 'Angular TransferState example'}},
        { path: 'with', component: WithTransferStateComponent, data: {title: 'Transfer state (API)', description: 'Angular TransferState example'}, resolve: {ping: PingWithTransferStateResolver, count: CountResolver}},
        { path: 'without', component: WithoutTransferStateComponent, data: {title: 'Transfer state (API)', description: 'Angular TransferState example'}, resolve: {ping: PingWithoutTransferStateResolver, count: CountResolver}}
    ]}
];

@NgModule({
  imports: [
      MatButtonModule,
      MatSnackBarModule,
      MatMenuModule,
    CommonModule,
      RouterModule.forRoot(routes),
      TranslateModule.forChild()
  ],
  declarations: [ AppComponent, HomeComponent, MenuComponent, DonorsComponent, WithTransferStateComponent, WithoutTransferStateComponent, TransferStateComponent ],
  exports: [ AppComponent ],
  providers: [
    WindowRef,
    SnackBarService,
    NotificationService,
    ExampleApiService,
    PingWithTransferStateResolver,
    PingWithoutTransferStateResolver,
      CountResolver
  ]
})
export class AppModule {
    private title: string = this.doc.querySelector('title').text;
    private description: string = this.metaService.getTag('name=description').content;

    constructor(private metaService: Meta, private route: ActivatedRoute, private router: Router, @Inject(DOCUMENT) private doc) {
        this.router.events.filter((e) => e instanceof NavigationEnd).forEach((e) => {
            this.metaService.updateTag({content: this.description + ' ' + route.root.firstChild.snapshot.data['description']}, 'name=description');
            this.doc.querySelector('title').childNodes[0].nodeValue = this.title + ' | ' + route.root.firstChild.snapshot.data['title'];
        });
    }
}
