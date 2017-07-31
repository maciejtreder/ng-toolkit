export function NotificationClick() {
    return (worker) => new NotificationClickImpl(worker)
}

export class NotificationClickImpl {
    setup(ops){}
    constructor() {
        self.addEventListener('notificationclick', function (event) {
            event.notification.close();
            event.waitUntil(clients.matchAll({
                includeUncotrolled: true,
                type: 'window'
            }).then(function(clientList) {
                if (event.notification.data) {
                    if (clients.openWindow)
                        return clients.openWindow(event.notification.data);
                }
                if (event.notification.title == 'New version available') {
                    for (var i = 0; i < clientList.length; i++) {
                        var client = clientList[i];
                        if (client.url == 'https://www.angular-universal-serverless.maciejtreder.com/' && 'focus' in client) {
                            console.log("focus client");
                            return client.focus();
                        }
                    }
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                }
            }))
        });
    }
}