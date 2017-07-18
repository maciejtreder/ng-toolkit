import { PLATFORM_ID, Injectable} from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { NgServiceWorker, NgPushRegistration } from '@angular/service-worker';
import { Observable } from 'rxjs';
import { RequestOptions, Headers, RequestOptionsArgs, Http } from '@angular/http';

import { SnackBarService } from './snack-bar.service';

@Injectable()
export class ServiceWorkerService {

    private updateInfoDisplayed:boolean = false;

    constructor(private snackBarService: SnackBarService,  private sw: NgServiceWorker,  private http: Http) {
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
                }).then(value => {
                    if (value[0] && value[0].active == true) {
                        clearInterval(interval);
                        localStorage.setItem("cache_done", "true");

                        this.snackBarService.showMessage("Caching complete! Future visits will work offline", "Ok", 5000);
                    }
                });
        }, 100);
        setTimeout(()=> clearInterval(interval), 10000); //check timeout
    }

    public checkForUpdates():void {
        Observable.merge(
            this.sw.push.filter(msg => msg.notification.title == "New version available"),
            this.sw.checkForUpdate().filter(update => update)
        ).flatMap(() => this.sw.updates).map(updateEvent => updateEvent.version)
        .subscribe(ver => this.sw.activateUpdate(ver).subscribe(() => this.displayUpdateMessage()));

        this.sw.log().map((log:any) => log.message)
            .filter((message: string) => message && message.indexOf("caching from network") > -1).first()
            .subscribe((message) => this.displayUpdateMessage());
    }

    /**
     * Wrapper for action invoked, when new files appear or new version of service-worker is installed.
     */
    private displayUpdateMessage(): void {
        if (this.updateInfoDisplayed)
            return
        this.updateInfoDisplayed = true;
        this.snackBarService.showMessage("New version of application installed", "Reload now", -1, () => window.location.reload(), true);
    }

    public registerForPush():void {
        this.sw.registerForPush({
            applicationServerKey: 'BKxp6BwVzRWy1Qbe63rHNbG46uwPTrl1RoeTJuyVBm42kvlUk0RuSkYk8NKoO0QK2GNV7eRhOLyV1KfmZhwU9Sc'
        }).subscribe((pushRegistration: NgPushRegistration) => {
            let headers: Headers = new Headers();
            headers.append("content-type", "application/json");
            let options: RequestOptionsArgs = new RequestOptions({headers: headers});
            this.http.post("https://api.angular-universal-serverless.maciejtreder.com/webpush/subscribe", JSON.stringify(pushRegistration), options).subscribe(null, err => console.log("error!!!", err));
        }, err => {
            console.error("error during register for push", err);
        });
    }

}