import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PodReaderComponent } from './pod-reader/pod-reader.component';


const routes: Routes = [
  {
    path: 'pod-reader',
    component: PodReaderComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
