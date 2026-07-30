import { Injectable, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Observer, Subject, BehaviorSubject } from 'rxjs';

import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { CadService } from '@services/cad/cad.service';
import { remove, each, find, upperCase } from 'lodash';
import { Fds } from '@services/fds-object/fds-object';
import { Surf } from '@services/fds-object/geometry/surf';
import { WebsocketMessageObject } from './websocket-message';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';
import { Fire } from '@services/fds-object/fire/fire';
import { ElementsService, FdsElementType } from '@services/elements/elements.service';
import { SelectionService } from '@services/selection/selection.service';

/**
 * The form that shows each kind of element.
 *
 * A click in the drawing opens the element in the app, and this says where. Two
 * kinds share a form - a &MESH with an `OPEN`, an &OBST with a &HOLE - and the
 * form works out which of its lists holds the selected element, so nothing here
 * has to tell it.
 */
const FORM_ROUTES: { readonly [type in FdsElementType]?: string } = {
  mesh: 'fds/geometry/mesh',
  open: 'fds/geometry/mesh',
  obst: 'fds/geometry/obstruction',
  hole: 'fds/geometry/obstruction',
  geom: 'fds/geometry/complex',
  surf: 'fds/geometry/surface',
  vent: 'fds/ventilation/basic',
  jetfan: 'fds/ventilation/jetfan',
  fire: 'fds/fire/fire',
  devc: 'fds/output/device',
  slcf: 'fds/output/slice',
  spec: 'fds/specie/injection',
  init: 'fds/general/init',
  zone: 'fds/general/zone'
};

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
    private snackBarService: SnackBarService,
    private elementsService: ElementsService,
    private selectionService: SelectionService
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
      if (isDevMode()) {
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
      if (isDevMode()) {
        console.log(e.name + ': ' + e.message);
      }
      answer.status = "error";
    }

    this.sendMessage(answer);
    return;
  }

  /**
   * Show an element of the scenario in the drawing.
   *
   * Takes a `uuid`, because that is what identifies an element in the app
   * (ADR-0005), and translates it here - the `idAC` is a link to CAD and is the
   * bridge's business, not the caller's.
   *
   * An element without one is skipped rather than sent: it was drawn in the
   * browser, and there is nothing to show in a drawing that does not contain it.
   */
  public selectCad(uuid: string) {
    if (!this.isConnected) { return; }

    const idAC = this.elementsService.idACOf(uuid);
    if (!idAC) { return; }

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
    // Add inert default layer. It is not in the CAD payload, and transformSurfs
    // carries over surfs the drawing knows nothing about - so the one from an
    // earlier import comes back with them, and adding a second would duplicate it.
    if (find(newSurfs, (surf: Surf) => upperCase(surf.id) == 'INERT') == undefined) {
      this.fds.geometry.surfs.push(new Surf(JSON.stringify({ id: "inert", editable: false })))
    }
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
   * A click in the drawing selects the same element in the app.
   *
   * The plugin names the element by `idAC`, so this is where `idAC` becomes a
   * `uuid` (ADR-0005). Selecting rather than navigating with the id is what puts
   * the 3D preview and the form on the same footing: both read the selection, so
   * a click in CAD highlights the element in 3D *and* opens it in its form.
   *
   * @param data message data, carrying the idAC the user clicked in CAD
   */
  public fSelect(data: any) {
    const found = this.elementsService.byIdAC(data?.idAC);
    // A drawing can hold objects the scenario knows nothing about
    if (!found) { return; }

    this.selectionService.setSelection([{ uuid: found.element.uuid, type: found.type }]);

    const route = FORM_ROUTES[found.type];
    if (route) { this.router.navigate([route]); }
  }
}
