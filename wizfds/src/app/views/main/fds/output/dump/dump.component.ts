import { Component, OnInit, OnDestroy } from '@angular/core';

import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { WebsocketService } from '@services/websocket/websocket.service';

@Component({
  selector: 'app-dump',
  templateUrl: './dump.component.html',
  styleUrls: ['./dump.component.scss']
})
export class DumpComponent implements OnInit, OnDestroy {

  main: Main;
  dump: any;

  mainSub;

  constructor(private mainService: MainService, private websocket: WebsocketService) { }

  ngOnInit() {
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.dump = this.main.currentFdsScenario.fdsObject.output.general;
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
  }

}
