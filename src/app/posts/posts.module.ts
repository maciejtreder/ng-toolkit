import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ListComponent } from './list.component';
import { PostComponent } from './post.component';
import { PostResolver } from '../services/resolvers/post.resolver';
import { PostsResolver } from '../services/resolvers/posts.resolver';
import { EchoService } from '../services/echo.service';
import { CommonModule } from '@angular/common';

@NgModule({
   declarations: [ListComponent, PostComponent],
   imports: [
       CommonModule,
       RouterModule.forChild([
           { path: '', component: ListComponent, resolve: {posts: PostsResolver} },
           { path: ':id', component: PostComponent, resolve: {post: PostResolver} }
       ])
   ],
   providers: [EchoService, PostsResolver, PostResolver]
})
export class PostsModule {}
