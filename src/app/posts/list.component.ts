import { Component, OnInit } from '@angular/core';
import { EchoService } from '../services/echo.service';
import { Observable } from 'rxjs/Observable';
import { IPost } from '../model/ipost';

@Component({
   templateUrl: `list.component.html`
})
export class ListComponent implements OnInit {
   public posts: Observable<IPost[]>;

   constructor(private echoService: EchoService) {}

   public ngOnInit(): void {
       this.posts = this.echoService.getPosts();
   }
}

