import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import {NgModule} from '@angular/core';
import {ServerModule, ServerTransferStateModule} from '@angular/platform-server';
import {ModuleMapLoaderModule} from '@nguniversal/module-map-ngfactory-loader';
import { BrowserModule } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
    
@NgModule({
 	bootstrap: [AppComponent],
  imports:[
		BrowserModule.withServerTransition({appId: 'app-root'}),
 		AppModule,
		ServerModule,
		NoopAnimationsModule,
		ModuleMapLoaderModule,
		ServerTransferStateModule, // comment
	]
})
export class AppServerModule {}
    