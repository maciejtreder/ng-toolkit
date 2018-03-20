import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { ExampleApiService } from '../exampleApi.service';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class PingWithoutTransferStateResolver implements Resolve<string> {
    constructor(private api: ExampleApiService) {}

    public resolve(snapshot: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> {
        return this.api.ping();
    }
}
