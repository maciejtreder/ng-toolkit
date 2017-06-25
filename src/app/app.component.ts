import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { NgServiceWorker } from '@angular/service-worker';
import { Observable } from 'rxjs';
import { RequestOptions, Headers } from '@angular/http';

import { HttpSwProxy } from 'ng-http-sw-proxy';
import { SnackBarService } from './services/snack-bar.service';

import * as _ from 'underscore';


@Component({
  moduleId: module.id,
  selector: 'app',
  template: `
    <h1>Angular Universal Serverless</h1>
    <a md-raised-button routerLink="/"> <i class="material-icons">home</i> Home</a>
    <a md-raised-button routerLink="/lazy"><i class="material-icons">free_breakfast</i> Lazy</a>
    <a md-raised-button routerLink="/httpProxy"><i class="material-icons">merge_type</i> Http proxy demo</a>
    <router-outlet></router-outlet>
  `,
    styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

    private platformId: Object;
    private updateInfoDisplayed: boolean;

    constructor(@Inject(PLATFORM_ID)  platformId: Object, private snackBarService: SnackBarService, private sw: NgServiceWorker, private http: HttpSwProxy) {
        this.platformId = platformId; //Intellij type checking workaround.
    }

    ngOnInit() {
        if(!isPlatformBrowser(this.platformId))
            return;

        this.checkServiceWorker();
        this.checkOnlineStatus();

        //checks if any new data is fetched by service worker
        this.sw.log().map((log:any) => log.message)
            .filter((message: string) => message && message.indexOf("caching from network") > -1).first()
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
        if (this.updateInfoDisplayed)
            return
        this.updateInfoDisplayed = true;
        this.snackBarService.showMessage("New version of application installed", "Reload now", -1, () => window.location.reload(), true);
    }

    /**
     * Checks network status
     */
    private checkOnlineStatus(): void {
        let previouseStatus: boolean = true;
        this.http.hasNetworkConnection().filter(status => status != previouseStatus).debounceTime(1000).subscribe(status => {
                previouseStatus = status;
                if (status == false) {
                    this.snackBarService.showMessage("You are offline. All changes will be synced when you will go online again.")
                }
                else {
                    this.snackBarService.showMessage("You are online. All data is synced.", "Ok", 5000);
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
                    if (value[0] && value[0].active == true) {
                        clearInterval(interval);
                        localStorage.setItem("cache_done", "true");

                        this.snackBarService.showMessage("Caching complete! Future visits will work offline", "Ok", 5000);
                    }
                });
        }, 100);
        setTimeout(()=> clearInterval(interval), 10000); //check timeout
    }
}
