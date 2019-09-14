import { Observable, Subject } from 'rxjs';
import { UpdateAvailableEvent, UpdateActivatedEvent } from '@angular/service-worker';

export class SwUpdateServerMock {
  public available: Observable<UpdateAvailableEvent> = new Subject<UpdateAvailableEvent>();
  public activated: Observable<UpdateActivatedEvent> = new Subject<UpdateActivatedEvent>();
  public isEnabled: boolean = false;

  public checkForUpdate(): Promise<void> {
    return new Promise((resolve) => resolve());
  }
  public activateUpdate(): Promise<void> {
    return new Promise((resolve) => resolve());
  }
}
