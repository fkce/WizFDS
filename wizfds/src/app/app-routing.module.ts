import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Add this for new routing components
import { ProjectsComponent } from './views/main/projects/projects.component';
import { MeshComponent } from './views/main/fds/geometry/mesh/mesh.component';
import { ObstructionComponent } from './views/main/fds/geometry/obstruction/obstruction.component';
import { GeneralComponent } from './views/main/fds/general/general.component';
import { MaterialComponent } from './views/main/fds/geometry/material/material.component';
import { SurfaceComponent } from './views/main/fds/geometry/surface/surface.component';
import { BasicComponent } from './views/main/fds/ventilation/basic/basic.component';
import { JetfanComponent } from './views/main/fds/ventilation/jetfan/jetfan.component';
import { FiresComponent } from './views/main/fds/fire/fires/fires.component';
import { CombustionComponent } from './views/main/fds/fire/combustion/combustion.component';
import { DumpComponent } from './views/main/fds/output/dump/dump.component';
import { BoundaryComponent } from './views/main/fds/output/boundary/boundary.component';
import { SliceComponent } from './views/main/fds/output/slice/slice.component';
import { IsosurfaceComponent } from './views/main/fds/output/isosurface/isosurface.component';
import { DeviceComponent } from './views/main/fds/output/device/device.component';
import { InputFileComponent } from './views/main/fds/input-file/input-file.component';
import { RampComponent } from './views/main/fds/ramp/ramp.component';
import { FuelComponent } from './views/main/fds/fire/fuel/fuel.component';
import { SpecComponent } from './views/main/fds/specie/spec/spec.component';
import { UserSettingsComponent } from './views/main/user-settings/user-settings.component';
import { LibraryEditorComponent } from './views/main/library-editor/library-editor.component';
import { InjectionComponent } from './views/main/fds/specie/injection/injection.component';
import { ComplexComponent } from './views/main/fds/geometry/complex/complex.component';
import { TestComponent } from './web-smokeview/test/test.component';

const routes: Routes = [
  {
    path: '',
    component: ProjectsComponent
  },
  {
    path: 'settings',
    component: UserSettingsComponent
  },
  {
    path: 'library',
    component: LibraryEditorComponent
  },
  {
    path: 'fds/general',
    component: GeneralComponent
  },

  {
    path: 'fds/geometry/mesh',
    component: MeshComponent
  },
  {
    path: 'fds/geometry/material',
    component: MaterialComponent
  },
  {
    path: 'fds/geometry/surface',
    component: SurfaceComponent
  },
  {
    path: 'fds/geometry/obstruction',
    component: ObstructionComponent
  },
  {
    path: 'fds/geometry/complex',
    component: ComplexComponent
  },
  {
    path: 'fds/ventilation/basic',
    component: BasicComponent
  },
  {
    path: 'fds/ventilation/jetfan',
    component: JetfanComponent
  },
  {
    path: 'fds/fire/fire',
    component: FiresComponent
  },
  {
    path: 'fds/fire/fuel',
    component: FuelComponent
  },
  {
    path: 'fds/fire/combustion',
    component: CombustionComponent
  },
  {
    path: 'fds/specie/spec',
    component: SpecComponent
  },
  {
    path: 'fds/specie/injection',
    component: InjectionComponent
  },
  {
    path: 'fds/output/dump',
    component: DumpComponent
  },

  {
    path: 'fds/output/boundary',
    component: BoundaryComponent
  },
  {
    path: 'fds/output/slice',
    component: SliceComponent
  },
  {
    path: 'fds/output/isosurface',
    component: IsosurfaceComponent
  },
  {
    path: 'fds/output/device',
    component: DeviceComponent
  },
  {
    path: 'fds/ramp',
    component: RampComponent
  },
  {
    path: 'fds/input',
    component: InputFileComponent
  },
  {
    path: 'webSmokeview',
    component: TestComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
