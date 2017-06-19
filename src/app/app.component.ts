import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { MdSnackBar, MdSnackBarConfig } from '@angular/material';
import { NgServiceWorker, UpdateEvent } from '@angular/service-worker';
import { Observable } from 'rxjs';

import * as _ from 'underscore';


@Component({
  moduleId: module.id,
  selector: 'app',
  template: `
    <h1>Angular Universal Serverless</h1>
    <a md-raised-button routerLink="/"> <i class="material-icons">home</i> Home</a>
    <a md-raised-button routerLink="/lazy"><i class="material-icons">free_breakfast</i> Lazy</a>
    <router-outlet></router-outlet>
  `,
    styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

    private platformId: Object;
    private snackBarDisplayed: boolean = false;
    private isUpdatePending: boolean = false;
    private snackBarConfig: MdSnackBarConfig = new MdSnackBarConfig();

    constructor(@Inject(PLATFORM_ID)  platformId: Object, private snackBar: MdSnackBar, private sw: NgServiceWorker) {
        this.platformId = platformId; //Intellij type checking workaround.
        this.snackBarConfig.extraClasses = ['service_worker_snack'];
    }

    ngOnInit() {
        if(!isPlatformBrowser(this.platformId))
            return;
        this.checkServiceWorker();
        this.checkOnlineStatus();

        //checks if any new data is fetched by service worker
        this.sw.log().map((log:any) => log.message)
            .filter((message: string) => message.indexOf("caching from network") > -1).first()
            .subscribe((message) => this.updateDone());

        //checks if there is new version of service worker
        this.sw.checkForUpdate().filter(update => update)
            .flatMap((x) => this.sw.updates).map(updateEvent => updateEvent.version)
            .flatMap(ver => this.sw.activateUpdate(ver)).subscribe(() => this.updateDone());
    }

    /**
     * Wrapper for action invoked, when new files appear or new version of service-worker is installed.
     */
    private updateDone(): void {
        this.isUpdatePending = true;
        this.showBlockingStatus("New version of application installed", "Reload now", () => window.location.reload());
    }

    /**
     * Displays information which cannot be overriden by any other message, until 'force' flag will be used.
     * Displayed info stays on the screen.
     * @param message
     * @param action
     * @param callback
     */
    private showBlockingStatus(message: string, action?: string, callback?: () => void): void {
        if (this.snackBarDisplayed)
            return;
        this.snackBarDisplayed = true;
        this.snackBar.dismiss();
        this.snackBar.open(message, action, this.snackBarConfig).afterDismissed().subscribe(() => {
            this.snackBarDisplayed = false;
            callback();
        });
    }

    /**
     * Displays information which can be overriden by other message. Force flag can be set to override blocked message (not applicable for info about update).
     * @param message
     * @param action
     * @param forceClose
     */
    private showNonBlockingStatus(message: string, action: string, forceClose: boolean = false): void {
        if (!this.snackBarDisplayed || (forceClose && !this.isUpdatePending)) {
            this.snackBar.dismiss();
            let settings: MdSnackBarConfig = _.clone(this.snackBarConfig);
            settings.duration = 5000;
            this.snackBar.open(message, action, settings);
        }
    }

    /**
     * Checks network status
     */
    private checkOnlineStatus(): void {
        let previouseStatus: boolean = true;
        Observable.merge(
            Observable.of(navigator.onLine),
            Observable.fromEvent(window, 'online').map(() => true),
            Observable.fromEvent(window, 'offline').map(() => false)
        ).filter(status => status != previouseStatus).subscribe(status => {
                previouseStatus = status;
                if (status == false) {
                    this.showBlockingStatus("You are offline. All changes will be synced when you will go online again.", null, null);
                }
                else {
                    this.showNonBlockingStatus("You are online. All data is synced.", "Ok", true);
                }
            });
    }

    /**
     * Checks if service worker is installed.
     */
    private checkServiceWorker(): void {
        if (!(process.env.NODE_ENV == 'production' && 'serviceWorker' in navigator) || localStorage.getItem("cache_done") == "true")
            return;

        let interval;
        interval = setInterval(() => {
            navigator['serviceWorker']
                .getRegistrations()
                .then(registrations => {
                    return registrations
                        .map(reg => {
                            return {
                                scope: reg.scope,
                                active: !!reg.active,
                                installing: !!reg.installing,
                                waiting: !!reg.waiting
                            };
                        })
                })
                .then(value => {
                    if (value[0].active == true) {
                        clearInterval(interval);
                        localStorage.setItem("cache_done", "true");

                        this.showNonBlockingStatus("Caching complete! Future visits will work offline", "Ok");
                    }
                });
        }, 100);
        setTimeout(()=> clearInterval(interval), 10000); //check timeout
    }
}
