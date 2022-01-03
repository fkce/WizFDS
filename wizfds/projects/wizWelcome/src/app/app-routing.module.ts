import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FrontComponent } from './view/front/front.component';

const routes: Routes = [
  {
    path: '',
    component: FrontComponent
  },
  {
    path: 'logout',
    component: FrontComponent
  },
  {
    path: '**',
    component: FrontComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
