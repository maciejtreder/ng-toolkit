import { Component } from '@angular/core';

@Component({
 selector: 'my-app',
 template: '<h1>Hello world!</h1>',
})
export class AppComponent {

 constructor(){
   console.log("I am Angular!")
 }
}

