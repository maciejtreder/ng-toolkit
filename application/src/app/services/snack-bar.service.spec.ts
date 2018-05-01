import { async, inject, TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarRef } from '@angular/material';
import * as sinon from 'sinon';
import { SnackBarNotification, SnackBar } from './snack-bar.service';
import { of, Subject } from 'rxjs';

let snackbarStub;
let snackbarRefStub;

describe('Snack bar service', () => {
  beforeEach(() => {
    snackbarStub = sinon.createStubInstance(MatSnackBar);
    snackbarRefStub = sinon.createStubInstance(MatSnackBarRef);

    snackbarStub.open.returns(snackbarRefStub);
    snackbarRefStub.afterDismissed.returns(of(true));

    TestBed.configureTestingModule({
      providers: [
        {provide: MatSnackBar, useValue: snackbarStub},
        SnackBar
      ]
    });
  });

  it('Should be able to construct', async(inject([SnackBar], (sbs: SnackBar) => {
    expect(sbs).toBeDefined('Cannot construct service!');
  })));

  it('Should be able to display notification', async(inject([SnackBar], (sbs: SnackBar) => {
    sbs.displayNotification({message: 'test', action: 'action'} as SnackBarNotification);
    expect(snackbarStub.open.calledOnce).toBeTruthy('Snack bar is not opened');
  })));

  it('Should be able to run callback', async(inject([SnackBar], (sbs: SnackBar) => {
    let callbackCalled: boolean = false;
    sbs.displayNotification({message: 'test1', action: 'action', callback: () => {callbackCalled = true; }} as SnackBarNotification);
    expect(callbackCalled).toBeTruthy('Callback was not called');
  })));

  it ('Should display notification with correct params', async(inject([SnackBar], (sbs: SnackBar) => {
    const testMessage = 'message_test';
    const testAction = 'action_test';
    const testDuration = 10;
    sbs.displayNotification({message: testMessage, action: testAction, duration: testDuration} as SnackBarNotification);
    expect(snackbarStub.open.getCall(0).args[2].duration).toBe(testDuration * 1000, 'Duration were not passed');
    expect(snackbarStub.open.getCall(0).args[1]).toBe(testAction, 'Duration were not passed');
    expect(snackbarStub.open.getCall(0).args[0]).toBe(testMessage, 'Duration were not passed');
  })));

  it('Notifications should be queued', async(inject([SnackBar], (sbs: SnackBar) => {
    const firstMessage = 'first message';
    const secondMessage = 'second message';
    sbs.displayNotification({message: firstMessage, action: 'action'} as SnackBarNotification);
    sbs.displayNotification({message: secondMessage, action: 'action'} as SnackBarNotification);
    expect(snackbarStub.open.calledTwice).toBeTruthy('Snack was not be opened second time.');
    expect(snackbarStub.open.getCall(0).args[0]).toBe(firstMessage, 'Messages are displayed in wrong order');
    expect(snackbarStub.open.getCall(1).args[0]).toBe(secondMessage, 'Messages are displayed in wrong order');
  })));

  it ('Priority notification should break order', async(inject([SnackBar], (sbs: SnackBar) => {
    const priorityMessage = 'priority notification';
    const ticker: Subject<boolean> = new Subject();
    snackbarRefStub.afterDismissed.returns(ticker);

    sbs.displayNotification({message: 'normal notification', action: 'action'} as SnackBarNotification);
    sbs.displayNotification({message: 'normal notification', action: 'action'} as SnackBarNotification);
    sbs.displayNotification({message: 'normal notification', action: 'action'} as SnackBarNotification);
    sbs.displayNotification({message: 'normal notification', action: 'action'} as SnackBarNotification);
    sbs.displayNotification({message: priorityMessage, action: 'action', force: true} as SnackBarNotification);

    ticker.next(true);
    ticker.next(true);
    ticker.next(true);
    ticker.next(true);

    expect(snackbarStub.open.getCall(1).args[0]).toBe(priorityMessage, 'Priority message did not break order'); // second call should have priority message, because first one is displayed immidiatelly
    expect(snackbarStub.open.getCall(4)).toBeDefined('Lack of last call');
  })));
});
