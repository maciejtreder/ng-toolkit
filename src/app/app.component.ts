import { Component, OnInit, PLATFORM_ID, Inject, ElementRef } from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { Observable } from 'rxjs';
import { DOCUMENT } from '@angular/platform-browser';
import * as _ from 'underscore';
import { ConnectivityService } from 'ng-http-sw-proxy';

import { DeviceService } from './services/device-service';
import { SnackBarService } from './services/snack-bar.service';
import { ServiceWorkerService} from './services/service-worker.service';




@Component({
  moduleId: module.id,
  selector: 'app',
  templateUrl: './app.component.html',
    styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

    private platformId: Object;
    private document: any;
    public isDesktop: boolean = this.deviceService.isDesktop();
    public offset: number = 0;
    public navIsFixed: boolean = false;
    public headerIsFixed: boolean = false;

    constructor(
        @Inject(PLATFORM_ID)  platformId: Object,
        private snackBarService: SnackBarService,
        private conn: ConnectivityService,
        private deviceService: DeviceService,
        @Inject(DOCUMENT) document: any,
        private elRef:ElementRef,
        private sws: ServiceWorkerService
    ) {
        this.platformId = platformId; //Intellij type checking workaround.
        this.document = document; //Intellij type checking workaround.
    }

    ngAfterViewInit() {
        // "sticky" header
        if (!isPlatformBrowser(this.platformId))
            return;

        if (this.isDesktop) {
            Observable.fromEvent(window, "scroll").subscribe((e: Event) => this.onScroll(e));
        } else {
            var div = this.elRef.nativeElement.querySelector('div.mat-sidenav-content');
            Observable.fromEvent(div, "scroll").subscribe((e: Event) => this.onScroll(e));
        }
        this.onScroll();
    }

    ngOnInit() {
        if(!isPlatformBrowser(this.platformId))
            return;

        this.sws.checkForUpdates();

        let isOnline: boolean = true;
        this.conn.hasNetworkConnection().filter(status => status != isOnline).debounceTime(1000).subscribe(status => {
            isOnline = status;
            if (status == false) {
                this.snackBarService.showMessage("You are offline. All changes will be synced when you will go online again.", "Close")
            }
            else {
                this.snackBarService.showMessage("You are online. All data is synced.", "Ok", 5000);
            }
        });
    }

    private onScroll(event?: Event): void {
        if(!event || !event.srcElement.scrollTop) {
            this.offset = this.document.body.scrollTop;
        } else {
            this.offset = event.srcElement.scrollTop;
        }
        this.headerIsFixed = this.offset > 0;
        this.navIsFixed = this.offset > 46;
    }
}