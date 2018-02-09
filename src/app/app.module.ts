import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { BrowserModule } from '@angular/platform-browser';
import { EchoService } from './services/echo.service';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  bootstrap: [ AppComponent ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  declarations: [ AppComponent ],
  providers: [EchoService]
})
export class AppModule {
}

