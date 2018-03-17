import { Observable } from 'rxjs';
import { IPost } from '../model/ipost';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EchoService } from '../services/echo.service';

@Component({
    template: '<h1>{{(post | async)?.title}}</h1><p>{{(post | async)?.body}}</p>'
})
export class PostComponent implements OnInit {
    public post: Observable<IPost>;

    constructor(private route: ActivatedRoute, private echoService: EchoService){}

    ngOnInit() {
        this.post = this.echoService.getPost(this.route.snapshot.params['id']);
    }
}
