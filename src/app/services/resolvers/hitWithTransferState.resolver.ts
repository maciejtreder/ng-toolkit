import 'rxjs/add/operator/do';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ExampleApiService } from '../exampleApi.service';
import { Observable } from 'rxjs/Observable';
import { makeStateKey, StateKey, TransferState } from '@angular/platform-browser';
import { isPlatformServer } from '@angular/common';

@Injectable()
export class HitWithTransferStateResolver implements Resolve<string> {
    private key: StateKey<string> = makeStateKey<string>('response');

    constructor(private api: ExampleApiService, private transferState: TransferState, @Inject(PLATFORM_ID) private platformId: any) {}

    public resolve(snapshot: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> {
        if (!this.transferState.hasKey(this.key)) {
            return this.api.hit().do((response: string) => {
                if (isPlatformServer(this.platformId)) {
                    this.transferState.set(this.key, response);
                }
            });
        } else {
            const value: string = this.transferState.get(this.key, 'error');
            this.transferState.remove(this.key);
            return Observable.of(value);
        }
    }
}
