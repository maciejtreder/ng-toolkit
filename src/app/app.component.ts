import { Component, OnInit, PLATFORM_ID, Inject, ElementRef, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
// import { ConnectivityService } from 'ng-http-sw-proxy';

import { ServiceWorkerService } from './services/service-worker.service';
import { SnackBarNotification, SnackBarService } from './services/snack-bar.service';
import { WindowRef } from './windowRef';

@Component({
  selector: 'app',
  templateUrl: './app.component.html',
    styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

    constructor(
        @Inject(PLATFORM_ID) private platformId: any,
        // private conn: ConnectivityService,
        private sws: ServiceWorkerService,
        private snackBarService: SnackBarService,
        private windowRef: WindowRef
    ) {}

    public ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.sws.update().filter((response) => response).subscribe(() => {
            this.snackBarService.displayNotification({message: 'New version of app is available!', action: 'Launch', force: true, callback: () => {
                this.windowRef.nativeWindow.location.reload(true);
            }} as SnackBarNotification);
        });

        this.sws.isCached().filter((response) => response && !localStorage.getItem('cached')).subscribe((response) => {
            localStorage.setItem('cached', 'cached');
            this.snackBarService.displayNotification({message: 'Content is cached, from now you can work offline.', action: 'Ok', duration: 5000} as SnackBarNotification);
        });

        // let isOnline: boolean = true;
        // this.conn.hasNetworkConnection()
        //     .filter((status: boolean) => status !== isOnline)
        //     .debounceTime(1000)
        //     .subscribe((status: boolean) => {
        //         isOnline = status;
        //         if (status === false) {
        //             this.snackBarService.displayNotification({message: 'You are offline. All changes will be synced when you will go online again.', action: 'Close'} as SnackBarNotification);
        //         } else {
        //             this.snackBarService.displayNotification({message: 'You are online. All data is synced.', action: 'Ok', duration: 3, force: true} as SnackBarNotification);
        //         }
        //     });
    }
}
