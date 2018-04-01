import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ExampleApi } from '../exampleApi.service';

@Injectable()
export class HitWithoutTransferStateResolver implements Resolve<string> {
    constructor(private api: ExampleApi) {}

    public resolve(snapshot: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> {
        return this.api.hit();
    }
}
