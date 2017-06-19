import { Component, OnInit } from '@angular/core'

@Component({
  moduleId: module.id,
  selector: 'app',
  template: `
    <h1>Angular Universal Serverless</h1>
    <a md-raised-button routerLink="/"> <i class="material-icons">home</i> Home</a>
    <a md-raised-button routerLink="/lazy"><i class="material-icons">free_breakfast</i> Lazy</a>
    <router-outlet></router-outlet>
  `,
  styles: [
    `h1 {
      color: orange;
      text-align: center;
    }
    :host {padding-top: 10px}`
  ]
})
export class AppComponent {
}
