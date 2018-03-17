import 'rxjs/Rx';
import { Injectable }from '@angular/core';
import { Observable }from 'rxjs/Observable';
import { Resolve, RouterStateSnapshot,
   ActivatedRouteSnapshot } from '@angular/router';

import { IPost } from '../../model/ipost';
import { EchoService } from '../echo.service';

@Injectable()
export class PostResolver implements Resolve<IPost> {
   constructor(private echoService: EchoService) {}

   resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<IPost> {
       return this.echoService.getPost(+route.paramMap.get('id')).catch(() => Observable.of({title: 'Post not found', body: 'Post with given id doesn\'t exist'} as IPost));
   }
}

