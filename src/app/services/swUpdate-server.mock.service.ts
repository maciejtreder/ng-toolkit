import { Observable } from 'rxjs/Observable';
import { UpdateActivatedEvent, UpdateAvailableEvent } from '@angular/service-worker/src/low_level';
import { Subject } from 'rxjs/Subject';

export class SwUpdateServerMock {
    public available: Observable<UpdateAvailableEvent> = new Subject();
    public activated: Observable<UpdateActivatedEvent> = new Subject();
    public checkForUpdate(): Promise<void> {
        return new Promise((resolve) => resolve());
    }
    public activateUpdate(): Promise<void> {
        return new Promise((resolve) => resolve());
    }
}
