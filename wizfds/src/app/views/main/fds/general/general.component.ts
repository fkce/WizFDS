import { Component, OnInit, OnDestroy } from '@angular/core';

import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { WebsocketService } from '@services/websocket/websocket.service';
import { General } from '@services/fds-object/general/general';

@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss']
})
export class GeneralComponent implements OnInit, OnDestroy {
  main: Main;
  general: General;
  dump: any;

  mainSub;

  constructor(private mainService: MainService, private websocket: WebsocketService) { }

  ngOnInit() {
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);

    this.general = this.main.currentFdsScenario.fdsObject.general;
    this.dump = this.main.currentFdsScenario.fdsObject.output.general;
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
  }
  
}
