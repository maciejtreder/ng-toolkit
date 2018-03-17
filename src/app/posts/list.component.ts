import { Component, Inject, OnInit } from '@angular/core';
import { EchoService } from '../services/echo.service';
import { Observable } from 'rxjs/Observable';
import { IPost } from '../model/ipost';

@Component({
   templateUrl: `list.component.html`
})
export class ListComponent implements OnInit {
   public posts: Observable<IPost[]>;

   constructor(@Inject(EchoService) private echoService: EchoService) {}

   public ngOnInit(): void {
       this.posts = this.echoService.getPosts();
   }
}

