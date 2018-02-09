import { Component, OnInit } from '@angular/core';
import { EchoService } from './services/echo.service';
import { Observable } from 'rxjs/Observable';
 
@Component({
 selector: 'my-app',
 templateUrl: `app.component.html`,
 styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
   public response: Observable<any>;
 
   constructor( private echoService: EchoService) {}

   public ngOnInit(): void {
       this.response = this.echoService.makeCall();
   }
}

