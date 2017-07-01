import { NgModule, Component } from '@angular/core'
import { RouterModule } from '@angular/router'
import { FormsModule }   from '@angular/forms';
import { MdInputModule, MdButtonModule } from '@angular/material';
import { CommonModule } from '@angular/common';

import { HttpProxyDemoComponent } from './http-proxy-demo.component';


@NgModule({
  declarations: [HttpProxyDemoComponent],
  imports: [
    MdButtonModule,
    MdInputModule,
    FormsModule,
    CommonModule,
    RouterModule.forChild([
      { path: '', component: HttpProxyDemoComponent, pathMatch: 'full'}
    ])
  ]
})
export class HttpProxyDemoModule {
}
