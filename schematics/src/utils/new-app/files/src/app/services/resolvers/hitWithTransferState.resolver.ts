import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ExampleApi } from '../exampleApi.service';
import { makeStateKey, StateKey, TransferState } from '@angular/platform-browser';
import { isPlatformServer } from '@angular/common';
import { Observable, of } from 'rxjs';

@Injectable()
export class HitWithTransferStateResolver implements Resolve<string> {
  private key: StateKey<string> = makeStateKey<string>('response');

  constructor(private api: ExampleApi, private transferState: TransferState, @Inject(PLATFORM_ID) private platformId: any) {}

  public resolve(snapshot: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> {
    if (!this.transferState.hasKey(this.key)) {
      return this.api.hit().pipe((response: Observable<string>) => {
        response.subscribe((resp: string) => {
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(this.key, resp);
          }
        });
        return response;
      });
    } else {
      const value: string = this.transferState.get(this.key, 'error');
      this.transferState.remove(this.key);
      return of(value);
    }
  }
}
