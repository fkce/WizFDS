import { Component, OnInit, OnDestroy } from '@angular/core';

import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { Bndf } from '@services/fds-object/output/bndf';
import { quantities } from '@enums/fds/enums/fds-enums-quantities';
import { Fds } from '@services/fds-object/fds-object';
import { Spec } from '@services/fds-object/specie/spec';

import { filter, includes, map } from 'lodash';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-boundary',
  templateUrl: './boundary.component.html',
  styleUrls: ['./boundary.component.scss']
})
export class BoundaryComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;

  // Component objects

  // Prepare quantities for select
  QUANTITIES = map(filter(quantities, function (o) { return includes(o.type, 'b') }), function (o) { return new Bndf(JSON.stringify(o)) });
  SPECIES: Spec[];

  mainSub: Subscription;

  constructor(private mainService: MainService) { }

  ngOnInit() {
    console.clear();
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    // Assign to local variables
    this.fds = this.main.currentFdsScenario.fdsObject;

    this.SPECIES = this.main.currentFdsScenario.fdsObject.specie.specs;
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
  }

  // COMPONENT METHODS
  public showSpecs(): boolean {
    let specs = filter(this.main.currentFdsScenario.fdsObject.output.bndfs, function(o: Bndf) { return o.spec == true; });
    let show = specs.length > 0 ? true : false;
    return show;
  }

  public showParts(): boolean {
    let parts = filter(this.main.currentFdsScenario.fdsObject.output.bndfs, function(o: Bndf) { return o.part == true; });
    let show = parts.length > 0 ? true : false;
    return show;
  }

}
