import { Component } from '@angular/core';
import { Http } from '@angular/http';
import { Observable } from 'rxjs';

@Component({
    selector: 'http-proxy',
    templateUrl: `./http-proxy.component.html`,
    styleUrls: ['./http-proxy.component.css'],
})
export class HttpProxyComponent {

    public valueToSend: string;
    public response: Observable<any>;

    constructor(private http: Http) {}

    public sendPost(): void {
        this.response = this.http.post('testPost', {exampleKey: this.valueToSend}).map((res) => res.json());
    }
}
