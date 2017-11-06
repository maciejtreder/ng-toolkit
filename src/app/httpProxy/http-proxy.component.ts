import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'http-proxy',
    templateUrl: `./http-proxy.component.html`,
    styleUrls: ['./http-proxy.component.css'],
})
export class HttpProxyComponent {

    public valueToSend: string;
    public response: Observable<any>;

    constructor(private http: HttpClient) {}

    public sendPost(): void {
        this.response = this.http.post('testPost', {exampleKey: this.valueToSend});
        this.response.subscribe((res) => console.log(res));
    }
}
