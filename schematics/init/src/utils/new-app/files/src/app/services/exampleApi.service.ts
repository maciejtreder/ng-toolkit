import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ExampleApi {
  private host: string = 'https://2tvdln9i91.execute-api.eu-central-1.amazonaws.com/production';

  constructor(private http: HttpClient) {}

  public hit(): Observable<string> {
    return this.http.get(this.host + '/hit', {responseType: 'text'});
  }
}
