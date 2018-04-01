import { Observable } from 'rxjs/Observable';
import { NgswCommChannel, UpdateActivatedEvent, UpdateAvailableEvent } from '@angular/service-worker/src/low_level';

export class SwPushServerMock {
    public messages: Observable<object>;
    public subscription: Observable<PushSubscription | null>;
    public requestSubscription(options: {
        serverPublicKey: string;
    }): Promise<PushSubscription> {
        return new Promise((resolve) => resolve());
    }
    public unsubscribe(): Promise<void> {
        return new Promise((resolve) => resolve());
    }
}
