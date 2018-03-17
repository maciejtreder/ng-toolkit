import { NgModule } from '@angular/core';
import { PostComponent } from './posts/post.component';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { ListComponent } from './posts/list.component';
import { BrowserModule } from '@angular/platform-browser';
import { MenuComponent } from './menu.component';
import { RouterModule } from '@angular/router';
import { EchoService } from './services/echo.service';
import { PostsResolver } from './services/resolvers/posts.resolver';
import { HttpClientModule } from '@angular/common/http';
import { PostResolver } from './services/resolvers/post.resolver';

@NgModule({
   bootstrap: [ AppComponent ],
   imports: [
       BrowserModule,
       HttpClientModule,
       RouterModule.forRoot([
           { path: '', redirectTo: '/home', pathMatch: 'full' },
           { path: 'home', component: HomeComponent },
           { path: 'posts', component: ListComponent, resolve: {posts: PostsResolver} },
           { path: 'posts/:id', component: PostComponent, resolve: {post: PostResolver} },
       ])
   ],
   declarations: [ AppComponent, MenuComponent, ListComponent, HomeComponent, PostComponent],
   providers: [EchoService, PostsResolver, PostResolver]
})
export class AppModule {
}

