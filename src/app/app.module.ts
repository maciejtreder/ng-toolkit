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
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Meta } from '@angular/platform-browser';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

const routes: any[] = [
    { path: '', component: HomeComponent, data: {title: 'Home', description: 'Home.'}},
    { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule', data: {title: 'Lazy module', description: 'Lazy module example.'}},
    { path: 'external', loadChildren: '@angular-universal-serverless/external-module/release#ExternalModule', data: {title: 'External module', description: 'External module example.'}}
];

export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http);
}

@NgModule({
  imports: [
      MatButtonModule,
      MatSnackBarModule,
      MatMenuModule,
      HttpClientModule,
    CommonModule,
      RouterModule.forRoot(routes),
      TranslateModule.forRoot({
          loader: {provide: TranslateLoader, useFactory: HttpLoaderFactory, deps: [HttpClient]}
      })
  ],
  declarations: [ AppComponent, HomeComponent, MenuComponent ],
  exports: [ AppComponent ],
  providers: [
    WindowRef,
    SnackBarService,
    NotificationService
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
