import { Component, OnInit } from '@angular/core';
import { TransferHttp } from '../../modules/transfer-http/transfer-http';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'home-view',
  template: `<div><h3>Hello World!</h3></div>`,
  styleUrls: ['../common.component.scss'],
})
export class HomeView implements OnInit {
  public subs: Observable<string>;

  constructor(private http: TransferHttp) {}

  ngOnInit() {
    this.subs = this.http.get('http://localhost:8000/data').map(data => {
      return `${data.greeting} ${data.name}`;
    });
  }
}
