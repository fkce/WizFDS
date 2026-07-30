import { Injectable } from '@angular/core';
import { Mesh } from '../fds-object/geometry/mesh';
import { upperCase, forEach, sortBy, filter, each, find, includes, map, cloneDeep, toInteger, round } from 'lodash';
import { Obst } from '../fds-object/geometry/obst';
import { Surf } from '../fds-object/geometry/surf';
import { MainService } from '../main/main.service';
import { Main } from '../main/main';
import { Library } from '../library/library';
import { LibraryService } from '../library/library.service';
import { Xb, Xyz, Color } from '../fds-object/primitives';
import { Ramp } from '../fds-object/ramp/ramp';
import { Matl } from '../fds-object/geometry/matl';
import { Open } from '../fds-object/geometry/open';
import { Hole } from '../fds-object/geometry/hole';
import { SurfVent } from '../fds-object/ventilation/surf-vent';
import { Vent } from '../fds-object/ventilation/vent';
import { JetFan } from '../fds-object/ventilation/jet-fan';
import { Fire } from '../fds-object/fire/fire';
import { Devc } from '../fds-object/output/devc';
import { Slcf } from '../fds-object/output/slcf';
import { VentSpec } from '@services/fds-object/specie/vent';
import { SurfSpec } from '@services/fds-object/specie/surf-spec';
import { Spec } from '@services/fds-object/specie/spec';
import { Geom } from '@services/fds-object/geometry/geom';

/**
 * How one collection is merged with an incoming CAD payload.
 *
 * `fromCad` builds an element the drawing has and the scenario does not yet.
 * `fromCurrent` rewrites onto an element already in the scenario the fields the
 * drawing owns, and returns it re-created from its own data. `prepare` runs for
 * every incoming element before it is matched, for the side imports a type needs
 * - a &SURF pulls in a &DEVC named after the same layer.
 */
interface CadMerge<T> {
  idPrefix: string;
  acType?: string;
  prepare?: (acElement: any) => void;
  fromCad: (acElement: any) => T;
  fromCurrent: (element: T, acElement: any) => T;
}

@Injectable()
export class CadService {

  main: Main;
  lib: Library;

  constructor(
    private mainService: MainService,
    private libraryService: LibraryService
  ) {
    this.mainService.getMain().subscribe(main => this.main = main);
    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);
  }

  /** Desc ... */
  binaryIndexOf(elem, list, prop) {
    let minIndex = 0;
    let maxIndex = list.length - 1;
    let currentIndex;
    let currentElement;

    while (minIndex <= maxIndex) {
      currentIndex = (minIndex + maxIndex) / 2 | 0;
      currentElement = list[currentIndex];
      if (currentElement[prop] < elem[prop]) {
        minIndex = currentIndex + 1;
      } else if (currentElement[prop] > elem[prop]) {
        maxIndex = currentIndex - 1;
      } else if (currentElement[prop] == elem[prop]) {
        return currentIndex;
      }
    }
    return -1;
  }

  /** Rewrite ids of imported elements */
  public rewriteIds(updatedElements: any[], type: string): any[] {
    // Rewrite elements Id
    let maxId = 0;
    // Check max Id of existing elements
    each(updatedElements, function (element) {
      if (element.id != "" && element.id.substr(0, 4) == type) {
        let number = Number(element.id.substr(4));
        if (number > maxId) {
          maxId = number;
        }
      }
    });

    // Next id 
    maxId++;

    // Add id to newly added elements
    each(updatedElements, function (element) {
      if (element.id == '') {
        element.id = type + maxId;
        maxId++;
      }
    });

    return updatedElements;
  }

  /**
   * Whether an element is linked to an object in the drawing.
   *
   * `idAC` is an optional link to CAD, not a primary key (ADR-0005): an element
   * drawn in the browser has a `uuid` and no `idAC`, and its absence is neither
   * an error nor a sign that something arrived from CAD.
   */
  private hasCadLink(element: any): boolean {
    return element.idAC != undefined && element.idAC !== '' && element.idAC !== 0;
  }

  /** Sort currnet elements by idAC */
  public sortCurrentElements(currentElements: any[]): any[] {
    let validCurrentElements = filter(currentElements, (element) => this.hasCadLink(element));

    let sortedCurrentElements = sortBy(validCurrentElements, function (element) {
      return element.idAC;
    });

    return sortedCurrentElements;
  }

  /** Elements the drawing knows nothing about, in the order they are held in */
  public webElements(currentElements: any[]): any[] {
    return filter(currentElements, (element) => !this.hasCadLink(element));
  }

  /**
   * Merge an incoming CAD payload into one collection of the scenario.
   *
   * The result is every element from the payload - matched to an existing one by
   * `idAC` among the elements that have an `idAC`, with the fields the drawing
   * owns rewritten - plus every existing element without an `idAC`, carried over
   * untouched. Absence from the payload therefore means "deleted in CAD" only for
   * elements that came from CAD; for one drawn in the browser it means nothing at
   * all (ADR-0005).
   *
   * `rewriteIds` sees the merged list, so a new element from CAD cannot be given
   * a number already taken by one drawn in the browser.
   */
  private mergeCadElements<T>(acElements: object[], currentElements: T[], merge: CadMerge<T>): T[] {
    let mergedElements: T[] = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements, merge.acType);
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    each(sortedAcElements, (acElement) => {

      if (merge.prepare != undefined) {
        merge.prepare(acElement);
      }

      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');

      // If element not exists
      if (res == -1) {
        mergedElements.push(merge.fromCad(acElement));
      }
      // Element is in current scenario - the drawing owns its geometry
      else {
        mergedElements.push(merge.fromCurrent(sortedCurrentElements[res], acElement));
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Elements drawn in the browser survive an import untouched - unless the
    // drawing brought one under the same id. A &SURF is a layer name to CAD, so a
    // surface added in the app and a layer of that name are the same surface, and
    // two of them would be ambiguous in the FDS file. Auto-numbered types never
    // collide, because a new id is always one past the highest one taken.
    let cadIds = map(mergedElements, 'id');
    each(this.webElements(currentElements), (element) => {
      if (element.id !== '' && includes(cadIds, element.id)) {
        return;
      }
      mergedElements.push(element);
    });

    // Rewrite ids
    return this.rewriteIds(mergedElements, merge.idPrefix);
  }

  /** Copy a ramp from the library into the current scenario, unless it is there already */
  private importRamp(rampId: string): void {
    let ramp = find(this.main.currentFdsScenario.fdsObject.ramps.ramps, function (o) {
      return o.id == rampId;
    });

    // Import ramp from library
    if (ramp == undefined) {
      let tempRamp = find(this.lib.ramps, function (o) {
        return o.id == rampId;
      });
      let libRamp = cloneDeep(tempRamp);

      if (libRamp != undefined) {
        // Copy to current fds scenario ramp
        this.main.currentFdsScenario.fdsObject.ramps.ramps.push(new Ramp(JSON.stringify(libRamp.toJSON())));
      }
    }
  }

  /**
   * Import a &DEVC from the library when one is named after an incoming layer.
   *
   * Such a device has no coordinates of its own, so it has to be put inside one
   * of the meshes - here the centre of the first one.
   */
  private importLayerDevc(acElement: any): void {
    // Check if devc exists on the same layer name
    let devc = find(this.main.currentFdsScenario.fdsObject.output.devcs, function (o) {
      return o.id == acElement.id;
    });

    // maybe worth to check again XYZ for devc if it's not inside any of the mesh ...
    if (devc != undefined) {
      return;
    }

    let tempDevc = find(this.lib.devcs, function (o) {
      return o.id == acElement.id;
    });
    let libDevc: Devc = cloneDeep(tempDevc);

    if (libDevc == undefined) {
      return;
    }

    // TODO add parts and props

    // If there is device with obst name layer = devc name
    // device should be put in one of the meshes.
    // Below we put all devices to the center of first mesh
    let meshes = this.main.currentFdsScenario.fdsObject.geometry.meshes;
    if (meshes.length > 0 && meshes[0]) {
      libDevc.xyz.x = round(meshes[0].xb.x1 + toInteger(meshes[0].ijk[0] / 2) * meshes[0].isize, 3);
      libDevc.xyz.y = round(meshes[0].xb.y1 + toInteger(meshes[0].ijk[1] / 2) * meshes[0].jsize, 3);
      libDevc.xyz.z = round(meshes[0].xb.z1 + toInteger(meshes[0].ijk[2] / 2) * meshes[0].ksize, 3);
    }

    this.main.currentFdsScenario.fdsObject.output.devcs.push(new Devc(JSON.stringify(libDevc.toJSON()), undefined, this.lib.specs, undefined));
  }

  /** Import the materials a library surf refers to, with their ramps */
  private importSurfMaterials(libSurf: any): void {
    // For each layer in surf
    each(libSurf.layers, (layer) => {

      // Import materials if exists
      if (!layer.materials) {
        return;
      }

      each(layer.materials, (material) => {
        // Check if exists in current scenario
        let matl = find(this.main.currentFdsScenario.fdsObject.geometry.matls, function (o) {
          return o.id == material.material.id;
        });

        // Import matl from library
        if (matl != undefined) {
          return;
        }

        // Import conductivity ramp
        if (material.material.conductivity_ramp && material.material.conductivity_ramp.id) {
          this.importRamp(material.material.conductivity_ramp.id);
        }

        // Import specific heat ramp
        if (material.material.specific_heat_ramp && material.material.specific_heat_ramp.id) {
          this.importRamp(material.material.specific_heat_ramp.id);
        }

        let tempMatl = find(this.lib.matls, function (o) {
          return o.id == material.material.id
        });
        let libMatl = cloneDeep(tempMatl);

        if (libMatl != undefined) {
          this.main.currentFdsScenario.fdsObject.geometry.matls.push(new Matl(JSON.stringify(libMatl.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps));
        }
      });
    });
  }

  /** Sort AC elements by idAC */
  public sortAcElements(acElements: any[], type?: string): any[] {
    if (type == 'surf') {
      acElements = filter(acElements, function (element) {
        return upperCase(element.id) != "INERT";
      });
    }

    let sortedAcElements = sortBy(acElements, function (element) {
      return element['idAC'];
    });
    return sortedAcElements;
  }

  /**
   * Transform CAD SURF elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformSurfs(acElements: object[], currentElements: Surf[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'SURF',
      acType: 'surf',
      // Import devc from library
      prepare: (acElement) => this.importLayerDevc(acElement),
      fromCad: (acElement) => {

        // Try to find surf in library
        let tempSurf = find(this.lib.surfs, function (o) {
          return o.id == acElement.id;
        });
        let libSurf = cloneDeep(tempSurf);

        // If exists import surf from library
        if (libSurf != undefined && libSurf.layers) {
          this.importSurfMaterials(libSurf);

          // Import library surf into current scenario
          return new Surf(JSON.stringify(libSurf.toJSON()), this.main.currentFdsScenario.fdsObject.geometry.matls);
        }

        // If it is not in library
        acElement.color = new Color(JSON.stringify({}), undefined, acElement.color);
        return new Surf(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.geometry.matls);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.id = acElement.id;

        // Create new element based on new data
        return new Surf(JSON.stringify(originalElement.toJSON()));
      }
    });
  }

  /**
   * Transform CAD MESH elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformMeshes(acElements: object[], currentElements: Mesh[]) {
    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'MESH',
      fromCad: (acElement) => {
        acElement.id = '';
        return new Mesh(JSON.stringify(acElement));
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));

        // Create new element based on new data
        return new Mesh(JSON.stringify(originalElement.toJSON()));
      }
    });
  }

  /**
   * Transform CAD OPEN elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformOpens(acElements: object[], currentElements: Open[]) {
    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'OPEN',
      fromCad: (acElement) => {
        acElement.id = '';
        return new Open(JSON.stringify(acElement));
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));

        // Create new element based on new data
        return new Open(JSON.stringify(originalElement.toJSON()));
      }
    });
  }

  /**
   * Transform CAD HOLE elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformHoles(acElements: object[], currentElements: Hole[]) {
    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'HOLE',
      fromCad: (acElement) => {
        acElement.id = '';
        return new Hole(JSON.stringify(acElement));
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));

        // Create new element based on new data
        return new Hole(JSON.stringify(originalElement.toJSON()));
      }
    });
  }

  /**
   * Transform CAD OBST elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformObsts(acElements: object[], currentElements: Obst[]) {
    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'OBST',
      fromCad: (acElement) => {
        acElement.id = '';
        acElement.devc_id = acElement.surf.surf_id;
        return new Obst(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.geometry.surfs, this.main.currentFdsScenario.fdsObject.output.devcs);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));
        originalElement.surf.surf_id['id'] = acElement.surf.surf_id;
        originalElement.elevation = acElement.elevation;

        // Create new element based on new data
        return new Obst(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.geometry.surfs, this.main.currentFdsScenario.fdsObject.output.devcs);
      }
    });
  }

  /**
   * Transform CAD GEOM elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformGeoms(acElements: object[], currentElements: Geom[]) {
    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'GEOM',
      fromCad: (acElement) => {
        acElement.id = '';
        return new Geom(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.geometry.surfs);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others. Unlike an &OBST a &GEOM
        // holds its &SURF as a plain reference, so the incoming surf id goes into
        // the serialized form and the constructor resolves it against the surfs
        // the scenario has now.
        originalElement.elevation = acElement.elevation;
        let geom = <any>originalElement.toJSON();
        geom.surf_id = acElement.surf.surf_id;

        // Create new element based on new data
        return new Geom(JSON.stringify(geom), this.main.currentFdsScenario.fdsObject.geometry.surfs);
      }
    });
  }

  /*
   * Transform CAD VENTSURF elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformVentSurfs(acElements: object[], currentElements: SurfVent[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'SURF',
      acType: 'surf',
      fromCad: (acElement) => {

        // Find surf in library
        let tempSurf = find(this.lib.ventsurfs, function (o) {
          return o.id == acElement.id;
        });
        let libSurf = cloneDeep(tempSurf);

        // Import surf from library if exists
        if (libSurf != undefined) {
          this.importRamp(libSurf.ramp.id);
          libSurf.idAC = acElement.idAC;

          // Import library surf into current scenario
          return new SurfVent(JSON.stringify(libSurf.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps);
        }

        // If it is not in library
        acElement.color = new Color(JSON.stringify({}), undefined, acElement.color);
        return new SurfVent(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.ramps.ramps);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.id = acElement.id;

        // Create new element based on new data
        return new SurfVent(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps);
      }
    });
  }

  /**
   * Transform CAD VENT elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformVents(acElements: object[], currentElements: Vent[]) {
    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'VENT',
      fromCad: (acElement) => {
        acElement.id = '';
        return new Vent(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.ventilation.surfs);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));

        // Create new element based on new data
        return new Vent(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.ventilation.surfs);
      }
    });
  }

  /**
   * Transform CAD JFAN elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformJetfans(acElements: object[], currentElements: JetFan[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'JFAN',
      fromCad: (acElement) => {

        // Find jetfan in library
        let tempJetfan = find(this.lib.jetfans, function (o) {
          return o.id == acElement.surf_id;
        });
        let libJetfan = cloneDeep(tempJetfan);

        // Import surf from library if exists
        if (libJetfan != undefined) {
          this.importRamp(libJetfan.ramp.id);

          // Reset id to assign default numeration
          libJetfan.id = '';
          libJetfan.xb = new Xb(JSON.stringify(acElement.xb));
          libJetfan.direction = acElement.direction;
          libJetfan.idAC = acElement.idAC;

          // Import library surf into current scenario
          return new JetFan(JSON.stringify(libJetfan.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps);
        }

        // Reset id to assign default numeration
        acElement.id = '';

        // If it is not in library
        acElement.color = new Color(JSON.stringify({}), undefined, acElement.color);
        return new JetFan(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.ramps.ramps);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));
        originalElement.direction = acElement.direction;
        originalElement.idAC = acElement.idAC;

        // Create new element based on new data
        return new JetFan(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps);
      }
    });
  }

  /*
   * Transform CAD SPECSURF elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformSpecSurfs(acElements: object[], currentElements: SurfSpec[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'SPES',
      acType: 'ssurf',
      fromCad: (acElement) => {

        // Find surf in library
        let tempSpec = find(this.lib.specsurfs, function (o) {
          return o.id == acElement.id;
        });
        let libSpec = cloneDeep(tempSpec);

        // Import surf from library if exists
        if (libSpec != undefined) {

          // Import ramp from library
          this.importRamp(libSpec.ramp.id);

          // Import species from library
          if (libSpec.specieFlowType == 'massFlux' && libSpec.massFlux.length > 0) {

            forEach(libSpec.massFlux, (massFluxSpec) => {
              let tempSpec = find(this.lib.specs, function (o) {
                return o.id == massFluxSpec.spec.id;
              });
              let libSpec = cloneDeep(tempSpec);

              // Copy to current fds scenario specs
              if (libSpec != undefined) {
                this.main.currentFdsScenario.fdsObject.specie.specs.push(new Spec(JSON.stringify(libSpec.toJSON())));
              }
            });
          }
          else if (libSpec.specieFlowType == 'massFraction' && libSpec.massFraction.length > 0) {

            forEach(libSpec.massFraction, (massFractionSpec) => {
              let tempSpec = find(this.lib.specs, function (o) {
                return o.id == massFractionSpec.spec.id;
              });
              let libSpec = cloneDeep(tempSpec);

              // Copy to current fds scenario specs
              if (libSpec != undefined) {
                this.main.currentFdsScenario.fdsObject.specie.specs.push(new Spec(JSON.stringify(libSpec.toJSON())));
              }
            });
          }

          libSpec.idAC = acElement.idAC;
          // Import library surf into current scenario
          return new SurfSpec(JSON.stringify(libSpec.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps, this.main.currentFdsScenario.fdsObject.specie.specs);
        }

        // If it is not in library
        acElement.color = new Color(JSON.stringify({}), undefined, acElement.color);
        return new SurfSpec(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.ramps.ramps, this.main.currentFdsScenario.fdsObject.specie.specs);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.id = acElement.id;

        // Create new element based on new data
        return new SurfSpec(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps, this.main.currentFdsScenario.fdsObject.specie.specs);
      }
    });
  }

  /**
   * Transform CAD SPEC elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformSpecVents(acElements: object[], currentElements: VentSpec[]) {
    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'SPEV',
      fromCad: (acElement) => {
        acElement.id = '';
        return new VentSpec(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.specie.surfs);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));

        // Create new element based on new data
        return new VentSpec(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.specie.surfs);
      }
    });
  }

  /**
   * Transform CAD FIRE elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformFires(acElements: object[], currentElements: Fire[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'FIRE',
      fromCad: (acElement) => {

        // Find fire in library
        let tempFire = find(this.lib.fires, function (o) {
          return o.id == acElement.surf_id;
        });
        let libFire = cloneDeep(tempFire);

        // Import surf from library if exists
        if (libFire != undefined) {
          if (libFire.surf.ramp != undefined) {
            this.importRamp(libFire.surf.ramp.id);
          }

          //libFire.id = '';
          libFire.idAC = acElement.idAC;
          libFire.vent.xb = new Xb(JSON.stringify(acElement.vent.xb));
          //libFire.calcArea();
          libFire.vent.xyz = new Xyz(JSON.stringify(acElement.vent.xyz));
          // Import library surf into current scenario
          return new Fire(JSON.stringify(libFire.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps);
        }

        // If it is not in library
        acElement.color = new Color(JSON.stringify({}), undefined, acElement.color);
        return new Fire(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.ramps.ramps);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.vent.xb = new Xb(JSON.stringify(acElement.vent.xb));
        originalElement.vent.xyz = new Xyz(JSON.stringify(acElement.vent.xyz));

        // Create new element based on new data
        return new Fire(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps);
      }
    });
  }

  /**
   * Transform CAD SLCF elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformSlcfs(acElements: object[], currentElements: Slcf[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'SLCF',
      fromCad: (acElement) => {

        // Find slcf in library
        let tempSlcf = find(this.lib.slcfs, function (o) {
          return o.id == acElement.id;
        });
        let libSlcf = cloneDeep(tempSlcf);

        // Import surf from library if exists
        if (libSlcf != undefined) {

          libSlcf.id = '';
          libSlcf.idAC = acElement.idAC;
          libSlcf.direction = acElement.direction;
          libSlcf.value = acElement.value;
          libSlcf.xb = new Xb(JSON.stringify(acElement.xb));
          // Import library surf into current scenario
          return new Slcf(JSON.stringify(libSlcf.toJSON()), this.main.currentFdsScenario.fdsObject.specie.specs, undefined);
        }

        // If it is not in library
        acElement.id = '';
        return new Slcf(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.specie.specs, undefined);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));
        originalElement.direction = acElement.direction;
        originalElement.value = acElement.value;

        // Create new element based on new data
        return new Slcf(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.specie.specs, undefined);
      }
    });
  }

  /**
   * Transform CAD DEVC elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformDevcs(acElements: object[], currentElements: Devc[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    return this.mergeCadElements(acElements, currentElements, {
      idPrefix: 'DEVC',
      fromCad: (acElement) => {

        // Find devc in library
        let tempDevc = find(this.lib.devcs, function (o) {
          return o.id == acElement.id;
        });
        let libDevc = cloneDeep(tempDevc);

        // Import surf from library if exists
        if (libDevc != undefined) {

          libDevc.id = '';
          libDevc.idAC = acElement.idAC;
          libDevc.xb = new Xb(JSON.stringify(acElement.xb));
          libDevc.xyz = new Xyz(JSON.stringify(acElement.xyz));
          libDevc.geometrical_type = acElement.geometrical_type;
          // Import library surf into current scenario
          return new Devc(JSON.stringify(libDevc.toJSON()), undefined, this.main.currentFdsScenario.fdsObject.specie.specs, undefined);
        }

        // If it is not in library
        acElement.id = '';
        return new Devc(JSON.stringify(acElement), undefined, this.main.currentFdsScenario.fdsObject.specie.specs);
      },
      fromCurrent: (originalElement, acElement) => {

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));
        originalElement.xyz = new Xyz(JSON.stringify(acElement.xyz));

        // Create new element based on new data
        return new Devc(JSON.stringify(originalElement.toJSON()), undefined, this.main.currentFdsScenario.fdsObject.specie.specs, undefined);
      }
    });
  }

}
