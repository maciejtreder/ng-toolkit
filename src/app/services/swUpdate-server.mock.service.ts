import { Observable } from 'rxjs/Observable';
import { UpdateActivatedEvent, UpdateAvailableEvent } from '@angular/service-worker/src/low_level';

export class SwUpdateServerMock {
    public available: Observable<UpdateAvailableEvent>;
    public activated: Observable<UpdateActivatedEvent>;
    public checkForUpdate(): Promise<void> {
        return new Promise((resolve) => resolve());
    }
    public activateUpdate(): Promise<void> {
        return new Promise((resolve) => resolve());
    }
}
