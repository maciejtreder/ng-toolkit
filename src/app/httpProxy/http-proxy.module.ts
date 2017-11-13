import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, MatInputModule } from '@angular/material';
import { CommonModule } from '@angular/common';
import { HttpProxyComponent } from './http-proxy.component';
// import { HttpSwProxyModule } from 'ng-http-sw-proxy';

@NgModule({
  declarations: [HttpProxyComponent],
  imports: [
      // HttpSwProxyModule,
    MatButtonModule,
    MatInputModule,
    FormsModule,
    CommonModule,
    RouterModule.forChild([
      { path: '', component: HttpProxyComponent, pathMatch: 'full'}
    ])
  ]
})
export class HttpProxyModule {}
