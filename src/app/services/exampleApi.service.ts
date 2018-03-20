import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class ExampleApiService {
    private host: string = 'https://www.angular-universal-pwa.maciejtreder.com';

    constructor(private http: HttpClient) {}

    public ping(): Observable<string> {
        return this.http.get(this.host + '/ping', {responseType: 'text'});
    }

    public count(): Observable<string> {
        return this.http.get(this.host + '/count', {responseType: 'text'});
    }
}
