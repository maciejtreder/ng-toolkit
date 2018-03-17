import { IPost } from '../model/ipost';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
   template: '<h1>{{post.title}}</h1><p>{{post.body}}</p>'
})
export class PostComponent implements OnInit {
   public post: IPost;

   constructor(private route: ActivatedRoute){}

   ngOnInit() {
       this.post = this.route.snapshot.data.post;
   }
}

