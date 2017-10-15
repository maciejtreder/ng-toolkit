import { NgModule, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, MatInputModule } from '@angular/material';
import { CommonModule } from '@angular/common';
import { HttpProxyComponent } from './http-proxy.component';

@NgModule({
  declarations: [HttpProxyComponent],
  imports: [
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
