import { Injectable, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Observer, Subject, BehaviorSubject } from 'rxjs';

import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { CadService } from '@services/cad/cad.service';
import { remove, each, findIndex } from 'lodash';
import { Fds } from '@services/fds-object/fds-object';
import { Surf } from '@services/fds-object/geometry/surf';
import { WebsocketMessageObject } from './websocket-message';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';
import { Fire } from '@services/fds-object/fire/fire';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  // change to user variable
  WS_URL: string = "ws://localhost:2012";
  wsObservable: Observable<any>;
  wsObserver: Observer<any>;
  ws;
  public dataStream: BehaviorSubject<any>;
  isConnected: boolean;

  main: Main;
  fds: Fds;

  requestCallbacks: object = {};
  requestStatus = new Subject<WebsocketMessageObject>();

  constructor(
    private mainService: MainService,
    private cadService: CadService,
    private router: Router,
    private snackBarService: SnackBarService
  ) {
    this.mainService.getMain().subscribe(main => this.main = main);
  }

  /**
   * Generates random id for websocket messages 
   */
  public idGenerator() {
    var id = Date.now() + '';
    var rand = Math.round(1000 * Math.random()) + '';
    id = id + rand;
    return id;
  }

  /**
   * Method initalize websocket connection 
   */
  public initializeWebSocket() {
    this.isConnected = false;

    //this.WS_URL = "ws://localhost:2012";
    this.WS_URL = "ws://"+ this.main.websocket.host +":"+ this.main.websocket.port;

    this.wsObservable = Observable.create((observer) => {
      this.ws = new WebSocket(this.WS_URL);
      this.ws.onopen = (e) => {
        this.isConnected = true;
        this.snackBarService.notify('success', 'CAD connection opened');
      };

      this.ws.onclose = (e) => {
        if (e.wasClean) {
          observer.complete();
        } else {
          observer.error(e);
        }
        this.isConnected = false;
      };

      this.ws.onerror = (e) => {
        observer.error(e);
        this.isConnected = false;
      }

      this.ws.onmessage = (e) => {
        // manage CAD requests
        // tutaj trzeba to obczaic
        let message: WebsocketMessageObject = JSON.parse(e.data);
        if (message.requestID) {
          // answer from CAD
          this.answerMessage(message);
        }
        else {
          // new request from CAD
          this.requestMessage(message);
        }

      }

      return () => {
        this.snackBarService.notify('warning', 'CAD connection closed');
        this.ws.close();
        this.isConnected = false;
      };
    });

    this.wsObserver = {
      next: (data: Object) => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(data));
        }
      },
      error: (err) => {
        if (isDevMode()) {
          console.log("Error sending data:");
          console.log(err);
        }
      },
      complete: () => {

      }
    }

    this.dataStream = Subject.create(this.wsObserver, this.wsObservable);
  }

  /** Method sends message to CAD software */
  public sendMessage(message: WebsocketMessageObject) {
    if (isDevMode()) {
      console.log("Message sent to CAD:")
      console.log(message);
      console.log("-----------------------------------------\n")
    }

    if (this.isConnected) {
      // Add new request to requestCallbacs object
      this.requestCallbacks[message.id] = message;
      // Send message to CAD
      this.dataStream.next(message);
    }

    return;
  }

  /** Method register answer/confirmation from CAD software */
  private answerMessage(message: WebsocketMessageObject) {
    if (isDevMode()) {
      console.log("Answer from CAD:");
      console.log(message);
      console.log("-----------------------------------------\n")
    }

    // Register & replace answer object in requestCallbacs
    this.requestCallbacks[message.requestID] = message;

    // Announce CAD message status
    this.requestStatus.next(message);

    // Check if something to do after answer
    try {
      switch (message.method) {
        case 'getCadGeometryWeb': {
          // Assign acFile and acPath
          this.main.currentFdsScenario.acFile = message.data['acFile'];
          this.main.currentFdsScenario.acPath = message.data['acPath'];

          // Update fds object
          if (this.main.currentFdsScenario != undefined) {
            this.fds = this.main.currentFdsScenario.fdsObject;
            this.fExport(message.data);
            this.snackBarService.notify('success', 'Geometry imported');
          }
          break;
        }
        default: {
          break;
        }
      }
    } catch (e) {
      if (e instanceof EvalError) {
        console.log(e.name + ': ' + e.message);
      } else if (e instanceof RangeError) {
        console.log(e.name + ': ' + e.message);
      }
      else {
        console.log(e.name + ': ' + e.message);
      }
    }

    return;
  }

  /** 
   * Method processes message from CAD software.
   * Creates new fds object with new geometry.
   */
  private requestMessage(message: WebsocketMessageObject) {
    if (isDevMode()) {
      console.log("Request from CAD:");
      console.log(message);
      console.log("-----------------------------------------\n")
    }

    // Send answer to CAD software;
    let answer: WebsocketMessageObject = {
      id: this.idGenerator(),
      requestID: message.id,
      status: "success",
      method: message.method,
      data: {},
    }

    if (this.main.currentFdsScenario == undefined) {
      answer.status = "error";

      this.sendMessage(answer);
      return;
    }

    // Assign acFile and acPath
    this.main.currentFdsScenario.acFile = message.data['acFile'];
    this.main.currentFdsScenario.acPath = message.data['acPath'];

    try {
      switch (message.method) {
        case 'fExport': {
          if (isDevMode()) console.log('fExport');

          this.fds = this.main.currentFdsScenario.fdsObject;
          this.fExport(message.data);
          this.snackBarService.notify('success', 'Geometry imported');

          break;
        }

        case 'selectObjectAc': {
          if (isDevMode()) console.log('fSelect');

          this.fds = this.main.currentFdsScenario.fdsObject;
          this.fSelect(message.data);
          //this.notifierService

          break;
        }

        default: {

          break;
        }
      }
    } catch (e) {
      if (e instanceof EvalError) {
        console.log(e.name + ': ' + e.message);
      } else if (e instanceof RangeError) {
        console.log(e.name + ': ' + e.message);
      }
      else {
        console.log(e.name + ': ' + e.message);
      }
      answer.status = "error";
    }

    this.sendMessage(answer);
    return;
  }

  /** 
   * Select CAD element after clicking in web aplication
   */
  public selectCad(idAC: number) {

    if (this.isConnected) {
      // Prepare message
      let message: WebsocketMessageObject = {
        method: 'selectObjectWeb',
        data: {
          idAC: idAC
        },
        id: this.idGenerator(),
        requestID: '',
        status: "waiting"
      }

      // Send message to CAD
      this.sendMessage(message);
    }
  }

  /** Importing CAD geometry */
  private fExport(data) {

    /** Devcs first */
    // Transform CAD elements
    let newDevcs = this.cadService.transformDevcs(data.output.devcs, this.fds.output.devcs);
    // Clone and delete current elements
    remove(this.fds.output.devcs);
    // Set new meshes to current scenario
    each(newDevcs, (devc) => {
      this.fds.output.devcs.push(devc);
    });

    /** Meshes */
    // Transform CAD elements
    let newMeshes = this.cadService.transformMeshes(data.geometry.meshes, this.fds.geometry.meshes);
    // Clone and delete current elements
    remove(this.fds.geometry.meshes);
    // Set new meshes to current scenario
    each(newMeshes, (mesh) => {
      this.fds.geometry.meshes.push(mesh);
    });

    /** Surfs */
    // Transform CAD elements
    let newSurfs = this.cadService.transformSurfs(data.geometry.surfs, this.fds.geometry.surfs);
    // Clone and delete current elements
    remove(this.fds.geometry.surfs);
    // Add inert default layer 
    this.fds.geometry.surfs.push(new Surf(JSON.stringify({ id: "inert", editable: false })))
    // Add new surfs to current scenario
    each(newSurfs, (surf) => {
      this.fds.geometry.surfs.push(surf);
    });

    /** Opens */
    // Transform CAD elements
    let newOpens = this.cadService.transformOpens(data.geometry.opens, this.fds.geometry.opens);
    // Clone and delete current elements
    remove(this.fds.geometry.opens);
    // Set new meshes to current scenario
    each(newOpens, (open) => {
      this.fds.geometry.opens.push(open);
    });

    /** Obsts */
    // Transform CAD elements
    let newObsts = this.cadService.transformObsts(data.geometry.obsts, this.fds.geometry.obsts);
    // Clone and delete current elements
    remove(this.fds.geometry.obsts);
    // Set new obsts to current scenario
    each(newObsts, (obst) => {
      this.fds.geometry.obsts.push(obst);
    });

    /** Holes */
    // Transform CAD elements
    let newHoles = this.cadService.transformHoles(data.geometry.holes, this.fds.geometry.holes);
    // Clone and delete current elements
    remove(this.fds.geometry.holes);
    // Set new holes to current scenario
    each(newHoles, (hole) => {
      this.fds.geometry.holes.push(hole);
    });

    /** Obsts */
    // Transform CAD elements
    let newGeoms = this.cadService.transformGeoms(data.geometry.geoms, this.fds.geometry.geoms);
    // Clone and delete current elements
    remove(this.fds.geometry.geoms);
    // Set new obsts to current scenario
    each(newGeoms, (geom) => {
      this.fds.geometry.geoms.push(geom);
    });

    /** Vent Surfs */
    // Transform CAD elements
    let newVentSurfs = this.cadService.transformVentSurfs(data.ventilation.surfs, this.fds.ventilation.surfs);
    // Clone and delete current elements
    remove(this.fds.ventilation.surfs);
    // Set new meshes to current scenario
    each(newVentSurfs, (surf) => {
      this.fds.ventilation.surfs.push(surf);
    });

    /** Vent */
    // Transform CAD elements
    let newVents = this.cadService.transformVents(data.ventilation.vents, this.fds.ventilation.vents);
    // Clone and delete current elements
    remove(this.fds.ventilation.vents);
    // Set new meshes to current scenario
    each(newVents, (vent) => {
      this.fds.ventilation.vents.push(vent);
    });

    /** Jetfans */
    // Transform CAD elements
    let newJetfans = this.cadService.transformJetfans(data.ventilation.jetfans, this.fds.ventilation.jetfans);
    // Clone and delete current elements
    remove(this.fds.ventilation.jetfans);
    // Set new meshes to current scenario
    each(newJetfans, (jetfan) => {
      this.fds.ventilation.jetfans.push(jetfan);
    });

    /** Vent Surfs */
    // Transform CAD elements
    let newSpecSurfs = this.cadService.transformSpecSurfs(data.specie.surfs, this.fds.specie.surfs);
    // Clone and delete current elements
    remove(this.fds.specie.surfs);
    // Set new meshes to current scenario
    each(newSpecSurfs, (spec) => {
      this.fds.specie.surfs.push(spec);
    });

    /** Vent */
    // Transform CAD elements
    let newSpecs = this.cadService.transformSpecVents(data.specie.vents, this.fds.specie.vents);
    // Clone and delete current elements
    remove(this.fds.specie.vents);
    // Set new meshes to current scenario
    each(newSpecs, (spec) => {
      this.fds.specie.vents.push(spec);
    });

    /** Fire */
    // Transform CAD elements
    let newFires = this.cadService.transformFires(data.fires.fires, this.fds.fires.fires);
    // Clone and delete current elements
    remove(this.fds.fires.fires);
    // Set new meshes to current scenario
    each(newFires, (fire: Fire) => {
      fire.vent.area = fire.vent.calcArea();
      fire.surf.hrr.area = fire.vent.area;
      this.fds.fires.fires.push(fire);
    });

    /** Slcfs */
    // Transform CAD elements
    let newSlcfs = this.cadService.transformSlcfs(data.output.slcfs, this.fds.output.slcfs);
    // Clone and delete current elements
    remove(this.fds.output.slcfs);
    // Set new meshes to current scenario
    each(newSlcfs, (slcf) => {
      this.fds.output.slcfs.push(slcf);
    });
  }

  /**
   * 
   * @param data Message data with idAC
   */
  public fSelect(data: any) {

    let idAC = data.idAC;

    if (idAC && idAC != "") {
      let element = this.findElementByIdAC(idAC);

      switch (element['type']) {
        case 'mesh':
          this.router.navigate(['fds/geometry/mesh', { idAC: idAC, type: 'mesh' }]);
          break;
        case 'open':
          this.router.navigate(['fds/geometry/mesh', { idAC: idAC, type: 'open' }]);
          break;
        case 'surf':
          this.router.navigate(['fds/geometry/surface', { idAC: idAC }]);
          break;
        case 'obst':
          this.router.navigate(['fds/geometry/obstruction', { idAC: idAC, type: 'obst' }]);
          break;
        case 'hole':
          this.router.navigate(['fds/geometry/obstruction', { idAC: idAC, type: 'hole' }]);
          break;
        case 'geom':
          this.router.navigate(['fds/geometry/complex', { idAC: idAC }]);
          break;
        case 'vent':
          this.router.navigate(['fds/ventilation/basic', { idAC: idAC }]);
          break;
        case 'jetfan':
          this.router.navigate(['fds/ventilation/jetfan', { idAC: idAC }]);
          break;
        case 'spec':
          this.router.navigate(['fds/specie/injection', { idAC: idAC }]);
          break;
        case 'fire':
          this.router.navigate(['fds/fire/fire', { idAC: idAC }]);
          break;
        case 'slcf':
          this.router.navigate(['fds/output/slice', { idAC: idAC }]);
          break;
        case 'devc':
          this.router.navigate(['fds/output/device', { idAC: idAC }]);
          break;
      }

      // lista range

    }
  }

  private findElementByIdAC(idAC): object {

    let result: any;

    let element = {
      type: "",
      index: "",
      idAC: idAC
    };

    result = findIndex(this.fds.geometry.meshes, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'mesh';
      element.index = result;
      return element;
    }

    result = findIndex(this.fds.geometry.opens, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'open';
      element.index = result;
      return element;
    }
    result = findIndex(this.fds.geometry.obsts, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'obst';
      element.index = result;
      return element;
    }

    result = findIndex(this.fds.geometry.holes, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'hole';
      element.index = result;
      return element;
    }

    result = findIndex(this.fds.geometry.geoms, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'geom';
      element.index = result;
      return element;
    }

    result = findIndex(this.fds.ventilation.vents, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'vent';
      element.index = result;
      return element;
    }

    result = findIndex(this.fds.ventilation.jetfans, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'jetfan';
      element.index = result;
      return element;
    }

    result = findIndex(this.fds.specie.vents, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'spev';
      element.index = result;
      return element;
    }

    result = findIndex(this.fds.fires.fires, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'fire';
      element.index = result;
      return element;
    }

    result = findIndex(this.fds.output.slcfs, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'slcf';
      element.index = result;
      return element;
    }

    result = findIndex(this.fds.output.devcs, function (elem) { return elem.idAC == idAC; });

    if (result >= 0) {
      element.type = 'devc';
      element.index = result;
      return element;
    }

    return element;

  }

}
