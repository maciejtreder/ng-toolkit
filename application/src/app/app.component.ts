import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { isPlatformBrowser } from '@angular/common';
import { SnackBar, SnackBarNotification } from './services/snack-bar.service';
import { WindowRef } from './window-ref.service';
import { TranslateService } from '@ngx-translate/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

  private title: string = this.titleService.getTitle();
  private metaDescription: string = this.metaService.getTag('name=description').content;

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private snackBarService: SnackBar,
    private windowRef: WindowRef,
    private swUpdate: SwUpdate,
    private translate: TranslateService,
    private titleService: Title,
    private metaService: Meta,
    private router: Router
  ) {
    this.translate.setDefaultLang(this.translate.getBrowserLang());
  }

  public ngOnInit(): void {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      const snapshot: ActivatedRouteSnapshot = this.router.routerState.snapshot.root.firstChild;

      const title: string = snapshot.data['title'];
      this.titleService.setTitle(this.title + ' | ' + title);

      const description: string = snapshot.data['description'];
      this.metaService.updateTag({ name: 'description', content: this.metaDescription + ' ' + description}, 'name=description');
    });

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.swUpdate.isEnabled) {
      this.swUpdate.available.subscribe((evt) => {
        this.snackBarService.displayNotification({
          message: 'New version of app is available!',
          action: 'Launch',
          force: true,
          callback: () => {
            this.windowRef.nativeWindow.location.reload(true);
          }
        } as SnackBarNotification);
      });

      this.swUpdate.checkForUpdate().then(() => {
        // noop
      }).catch((err) => {
        console.error('error when checking for update', err);
      });
    }
  }
}
