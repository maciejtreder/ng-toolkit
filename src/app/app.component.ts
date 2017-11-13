import { Component, OnInit, PLATFORM_ID, Inject, ElementRef, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
// import { ConnectivityService } from 'ng-http-sw-proxy';

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
        // private conn: ConnectivityService,
        private snackBarService: SnackBarService,
        private windowRef: WindowRef,
        private swUpdate: SwUpdate
    ) {}

    public ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.swUpdate.available.subscribe(() => {
            this.snackBarService.displayNotification({message: 'New version of app is available!', action: 'Launch', force: true, callback: () => {
                this.windowRef.nativeWindow.location.reload(true);
            }} as SnackBarNotification);
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
