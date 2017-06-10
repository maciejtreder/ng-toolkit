import {NgModule, Component} from '@angular/core'
import {RouterModule} from '@angular/router'


@Component({
  selector: 'lazy-view',
  template: `<div><h3>I am lazy!</h3></div>`,
  styleUrls: ['../common.component.css']
})
export class LazyView {}

@NgModule({
  declarations: [LazyView],
  imports: [
    RouterModule.forChild([
      { path: '', component: LazyView, pathMatch: 'full'}
    ])
  ]
})
export class LazyModule {

}
