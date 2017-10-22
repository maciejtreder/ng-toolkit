import { Directive, HostListener, Input } from '@angular/core';

@Directive({
    selector: '[routerLink]'
})
export class RouterLinkStubDirective {

    public navigatedTo: any = null;
    @Input()
    private routerLink: any;

    @HostListener('click')
    public onClick(): void {
        this.navigatedTo = this.routerLink;
    }
}
