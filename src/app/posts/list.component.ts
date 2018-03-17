import { Component, OnInit } from '@angular/core';
import { IPost } from '../model/ipost';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
   templateUrl: `list.component.html`,
    styles: [`
        a:hover {cursor: pointer}
    `]
})
export class ListComponent implements OnInit {
    public posts: IPost[];
   public page: number;

   constructor(private activatedRoute: ActivatedRoute, private router: Router) {}

   public ngOnInit(): void {
       this.activatedRoute.queryParams.subscribe(params => {
           this.page = +params['page'] || 0;
           this.posts = this.activatedRoute.snapshot.data.posts.filter(post => post.id > this.page * 10 && post.id < this.page * 10 + 11);
       });
   }

   public nextPage(): void {
       this.router.navigate(['posts'], {queryParams: {page: this.page + 1}});
   }

   public previousPage(): void {
       this.router.navigate(['posts'], {queryParams: {page: this.page - 1}});
   }
}
