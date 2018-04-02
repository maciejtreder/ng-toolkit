import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { BrowserModule } from '@angular/platform-browser';
import { MenuComponent } from './menu.component';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  bootstrap: [ AppComponent ],
  imports: [
      BrowserModule,
      HttpClientModule,
      RouterModule.forRoot([
          { path: '', redirectTo: '/home', pathMatch: 'full' },
          { path: 'home', component: HomeComponent },
          { path: 'posts', loadChildren: './posts/posts.module#PostsModule'},
      ])
  ],
  declarations: [ AppComponent, MenuComponent, HomeComponent],
})
export class AppModule {
}

