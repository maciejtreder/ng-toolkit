import 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { IPost } from '../model/ipost';

@Injectable()
export class EchoService {
	constructor(private httpClient: HttpClient) {}

	public getPosts(): Observable<IPost[]> {
		return this.httpClient.get<IPost[]>('https://jsonplaceholder.typicode.com/posts');
	}

    public getPost(id: number): Observable<IPost> {
        return this.httpClient.get<IPost>('https://jsonplaceholder.typicode.com/posts/' + id);
    }

} 
