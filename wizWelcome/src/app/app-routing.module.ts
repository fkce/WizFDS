import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent } from './view/main/main.component';
import { FrontComponent } from './view/front/front.component';

const routes: Routes = [
  {
    path: '',
    component: FrontComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
