import { Component, OnInit } from '@angular/core'

@Component({
  moduleId: module.id,
  selector: 'app',
  template: `
    <h1>Angular Universal Serverless</h1>
    <a md-raised-button routerLink="/">Home</a>
    <a md-raised-button routerLink="/lazy">Lazy</a>
    <router-outlet></router-outlet>
  `,
  styles: [
    `h1 {
      color: orange;
      text-align: center;
    }`
  ]
})
export class AppComponent {
}
