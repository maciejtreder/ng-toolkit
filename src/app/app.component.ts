import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SnackBarNotification, SnackBarService } from './services/snack-bar.service';
import { WindowRef } from './windowRef';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app',
  templateUrl: './app.component.html',
    styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

    constructor(
        @Inject(PLATFORM_ID) private platformId: any,
        private snackBarService: SnackBarService,
        private windowRef: WindowRef,
        private swUpdate: SwUpdate
    ) {}

    public ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        try {
            this.swUpdate.activated.filter(() => !localStorage.getItem('cached')).subscribe(() => {
                localStorage.setItem('cached', 'displayed');
                this.snackBarService.displayNotification({
                    message: 'Content is cached', action: 'Ok'
                } as SnackBarNotification);
            });
            this.swUpdate.available.subscribe(() => {
                this.snackBarService.displayNotification({
                    message: 'New version of app is available!', action: 'Launch', force: true, callback: () => {
                        this.windowRef.nativeWindow.location.reload(true);
                    }
                } as SnackBarNotification);
            });
        } catch (err) {
            // workaround for https://github.com/angular/angular/issues/20519
        }
    }
}
