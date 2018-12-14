import { Injectable } from '@angular/core';
import { Mesh } from '../fds-object/geometry/mesh';
import { map, sortBy, filter, each, find, cloneDeep } from 'lodash';
import { Obst } from '../fds-object/geometry/obst';
import { Surf } from '../fds-object/geometry/surf';
import { MainService } from '../main/main.service';
import { Main } from '../main/main';
import { Library } from '../library/library';
import { LibraryService } from '../library/library.service';
import { Xb, Quantity, Xyz } from '../fds-object/primitives';
import { Ramp } from '../fds-object/ramp/ramp';
import { Matl } from '../fds-object/geometry/matl';
import { Open } from '../fds-object/geometry/open';
import { Hole } from '../fds-object/geometry/hole';
import { SurfVent } from '../fds-object/ventilation/surf-vent';
import { Vent } from '../fds-object/ventilation/vent';
import { JetFan } from '../fds-object/ventilation/jet-fan';
import { Fire } from '../fds-object/fire/fire';
import { forEach } from 'lodash';
import { upperCase } from 'lodash';
import { Devc } from '../fds-object/output/devc';
import { Slcf } from '../fds-object/output/slcf';

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

  /** Sort currnet elements by idAC */
  public sortCurrentElements(currentElements: any[]): any[] {
    let validCurrentElements = filter(currentElements, function (element) {
      return element.idAC != undefined && element.idAC != '';
    });

    let sortedCurrentElements = sortBy(validCurrentElements, function (element) {
      return element.idAC;
    });

    return sortedCurrentElements;
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

    let updatedElements = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements, 'surf');
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    forEach(sortedAcElements, (acElement) => {

      // Check if devc exists on the same layer name
      let devc = find(this.main.currentFdsScenario.fdsObject.output.devcs, function (o) {
        return o.id == acElement.id;
      });

      // Import devc from library
      if (devc == undefined) {
        let tempDevc = find(this.lib.devcs, function (o) {
          return o.id == acElement.id;
        });
        let libDevc = cloneDeep(tempDevc);

        if (libDevc != undefined) {
          // Copy to current fds scenario ramp
          // TODO add parts and props
          this.main.currentFdsScenario.fdsObject.output.devcs.push(new Devc(JSON.stringify(libDevc.toJSON()), undefined, this.lib.specs, undefined));
        }
      }

      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');

      // If surf element not exists in currnet scenario
      if (res == -1) {

        // Try to find surf in library
        let tempSurf = find(this.lib.surfs, function (o) {
          return o.id == acElement.id;
        });
        let libSurf = cloneDeep(tempSurf);

        // If exists import surf from library
        if (libSurf != undefined && libSurf.layers) {

          // For each layer in surf
          each(libSurf.layers, (layer) => {

            // Import materials if exists
            if (layer.materials) {
              each(layer.materials, (material) => {
                // Check if exists in current scenario
                let matl = find(this.main.currentFdsScenario.fdsObject.geometry.matls, function (o) {
                  return o.id == material.material.id;
                });

                // Import matl from library
                if (matl == undefined) {
                  // Import conductivity ramp
                  if (material.material.conductivity_ramp && material.material.conductivity_ramp.id) {
                    let ramp = find(this.main.currentFdsScenario.fdsObject.ramps.ramps, function (o) {
                      return o.id == material.material.conductivity_ramp.id;
                    });

                    // Import ramp from library
                    if (ramp == undefined) {
                      let tempRamp = find(this.lib.ramps, function (o) {
                        return o.id == material.material.conductivity_ramp.id;
                      });
                      let libRamp = cloneDeep(tempRamp);

                      if (libRamp != undefined) {
                        // Copy to current fds scenario ramp
                        this.main.currentFdsScenario.fdsObject.ramps.ramps.push(new Ramp(JSON.stringify(libRamp.toJSON())));
                      }
                    }
                  }

                  // Import specific heat ramp
                  if (material.material.specific_heat_ramp && material.material.specific_heat_ramp.id) {
                    let ramp = find(this.main.currentFdsScenario.fdsObject.ramps.ramps, function (o) {
                      return o.id == material.material.specific_heat_ramp.id;
                    });

                    // Import ramp from library
                    if (ramp == undefined) {
                      let tempRamp = find(this.lib.ramps, function (o) {
                        return o.id == material.material.specific_heat_ramp.id;
                      });
                      let libRamp = cloneDeep(tempRamp);

                      if (libRamp != undefined) {
                        // Copy to current fds scenario ramp
                        this.main.currentFdsScenario.fdsObject.ramps.ramps.push(new Ramp(JSON.stringify(libRamp.toJSON())));
                      }
                    }
                  }

                  let tempMatl = find(this.lib.matls, function (o) {
                    return o.id == material.material.id
                  });
                  let libMatl = cloneDeep(tempMatl);

                  if (libMatl != undefined) {
                    this.main.currentFdsScenario.fdsObject.geometry.matls.push(new Matl(JSON.stringify(libMatl.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps));
                  }
                }

              });
            }
          });

          // Import library surf into current scenario
          updatedElements.push(new Surf(JSON.stringify(libSurf.toJSON()), this.main.currentFdsScenario.fdsObject.geometry.matls));
        }
        else {
          // If it is not in library
          updatedElements.push(new Surf(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.geometry.matls));
        }
      }
      else {
        let originalElement: Surf = sortedCurrentElements[res];

        // Rewrite properties and leave unchanged others
        originalElement.id = acElement.id;

        // Create new element based on new data
        let newElement = new Surf(JSON.stringify(originalElement.toJSON()));
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'SURF');

    return updatedElements;
  }

  /**
   * Transform CAD MESH elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformMeshes(acElements: object[], currentElements: Mesh[]) {
    let updatedElements = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements);
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    each(sortedAcElements, (acElement) => {
      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');
      // If element not exists
      if (res == -1) {
        acElement.id = '';
        updatedElements.push(new Mesh(JSON.stringify(acElement)));
      }
      else {
        let originalElement: Mesh = sortedCurrentElements[res];

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));

        // Create new element based on new data
        let newElement = new Mesh(JSON.stringify(originalElement.toJSON()));
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'MESH');

    return updatedElements;
  }

  /**
   * Transform CAD OPEN elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformOpens(acElements: object[], currentElements: Open[]) {
    let updatedElements = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements);
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    each(sortedAcElements, (acElement) => {
      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');
      // If element not exists
      if (res == -1) {
        acElement.id = '';
        updatedElements.push(new Open(JSON.stringify(acElement)));
      }
      else {
        let originalElement: Open = sortedCurrentElements[res];

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));

        // Create new element based on new data
        let newElement = new Open(JSON.stringify(originalElement.toJSON()));
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'OPEN');

    return updatedElements;
  }

  /**
   * Transform CAD HOLE elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformHoles(acElements: object[], currentElements: Hole[]) {
    let updatedElements = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements);
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    each(sortedAcElements, (acElement) => {
      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');
      // If element not exists
      if (res == -1) {
        acElement.id = '';
        updatedElements.push(new Hole(JSON.stringify(acElement)));
      }
      else {
        let originalElement: Hole = sortedCurrentElements[res];

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));

        // Create new element based on new data
        let newElement = new Hole(JSON.stringify(originalElement.toJSON()));
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'HOLE');

    return updatedElements;
  }

  /**
   * Transform CAD OBST elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformObsts(acElements: object[], currentElements: Obst[]) {
    let updatedElements = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements);
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC elemenj
    each(sortedAcElements, (acElement) => {

      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');

      // If element not exists
      if (res == -1) {
        acElement.id = '';
        acElement.devc_id = acElement.surf.surf_id;
        updatedElements.push(new Obst(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.geometry.surfs, this.main.currentFdsScenario.fdsObject.output.devcs));
      }
      else {
        let originalElement: Obst = sortedCurrentElements[res];

        let surfType = originalElement.surf.type;
        let surfId;

        switch (surfType) {
          case 'surf_id':
            surfId = 'surf_id'; break;
          case 'surf_ids':
            surfId = 'surf_idx'; break;
          case 'surf_id6':
            surfId = 'surf_id1'; break;
        }

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));
        originalElement.surf.surf_id['id'] = acElement.surf.surf_id;
        originalElement.elevation = acElement.elevation;

        // Create new element based on new data
        let newElement = new Obst(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.geometry.surfs);
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'OBST');

    return updatedElements;
  }

  /**
   * Transform CAD VENTSURF elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformVentSurfs(acElements: object[], currentElements: SurfVent[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);
    let updatedElements = [];

    // Sort AC and current elements
    var sortedAcElements = this.sortAcElements(acElements, 'surf');
    var sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    each(sortedAcElements, (acElement) => {

      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');
      // If surf element not exists in currnet scenario
      if (res == -1) {
        // Find surf in library
        let tempSurf = find(this.lib.ventsurfs, function (o) {
          return o.id == acElement.id;
        });
        let libSurf = cloneDeep(tempSurf);

        // Import surf from library if exists
        if (libSurf != undefined) {
          let ramp = find(this.main.currentFdsScenario.fdsObject.ramps.ramps, function (o) {
            return o.id == libSurf.ramp.id;
          });

          // Import ramp from library
          if (ramp == undefined) {
            let tempRamp = find(this.lib.ramps, function (o) {
              return o.id == libSurf.ramp.id;
            });
            let libRamp = cloneDeep(tempRamp);

            if (libRamp != undefined) {
              // Copy to current fds scenario ramp
              this.main.currentFdsScenario.fdsObject.ramps.ramps.push(new Ramp(JSON.stringify(libRamp.toJSON())));
            }
          }
          libSurf.idAC = acElement.idAC;
          // Import library surf into current scenario
          updatedElements.push(new SurfVent(JSON.stringify(libSurf.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps));
        }
        else {
          // If it is not in library
          updatedElements.push(new SurfVent(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.ramps.ramps));
        }
      }
      else {
        let originalElement: SurfVent = sortedCurrentElements[res];

        // Rewrite properties and leave unchanged others
        originalElement.id = acElement.id;

        // Create new element based on new data
        let newElement = new SurfVent(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps);
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'SURF');

    return updatedElements;
  }

  /**
   * Transform CAD VENT elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformVents(acElements: object[], currentElements: Vent[]) {
    let updatedElements = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements);
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    each(sortedAcElements, (acElement) => {
      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');
      // If element not exists
      if (res == -1) {
        acElement.id = '';
        updatedElements.push(new Vent(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.ventilation.surfs));
      }
      else {
        let originalElement: Vent = sortedCurrentElements[res];

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));

        // Create new element based on new data
        let newElement = new Vent(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.ventilation.surfs);
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'VENT');

    return updatedElements;
  }

  /**
   * Transform CAD JFAN elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformJetfans(acElements: object[], currentElements: JetFan[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);
    let updatedElements = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements);
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    each(sortedAcElements, (acElement) => {

      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');

      // If element not exists
      if (res == -1) {

        // Find jetfan in library
        let tempJetfan = find(this.lib.jetfans, function (o) {
          return o.id == acElement.surf_id;
        });
        let libJetfan = cloneDeep(tempJetfan);

        // Import surf from library if exists
        if (libJetfan != undefined) {
          let ramp = find(this.main.currentFdsScenario.fdsObject.ramps.ramps, function (o) {
            return o.id == libJetfan.ramp.id;
          });

          // Import ramp from library
          if (ramp == undefined) {
            let tempRamp = find(this.lib.ramps, function (o) {
              return o.id == libJetfan.ramp.id;
            });
            let libRamp = cloneDeep(tempRamp);

            if (libRamp != undefined) {
              // Copy to current fds scenario ramp
              this.main.currentFdsScenario.fdsObject.ramps.ramps.push(new Ramp(JSON.stringify(libRamp.toJSON())));
            }
          }
          // Reset id to assign default numeration 
          libJetfan.id = '';
          libJetfan.xb = new Xb(JSON.stringify(acElement.xb));
          libJetfan.direction = acElement.direction;
          libJetfan.idAC = acElement.idAC;

          // Import library surf into current scenario
          updatedElements.push(new JetFan(JSON.stringify(libJetfan.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps));
        }
        else {
          // Reset id to assign default numeration 
          acElement.id = '';

          // If it is not in library
          updatedElements.push(new JetFan(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.ramps.ramps));
        }
      }
      else {
        let originalElement: JetFan = sortedCurrentElements[res];

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));
        originalElement.direction = acElement.direction;
        originalElement.idAC = acElement.idAC;

        // Create new element based on new data
        let newElement = new JetFan(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps);
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'JFAN');

    return updatedElements;
  }

  /**
   * Transform CAD FIRE elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformFires(acElements: object[], currentElements: Fire[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);
    let updatedElements = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements);
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    each(sortedAcElements, (acElement) => {

      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');
      // If element not exists
      if (res == -1) {

        // Find fire in library
        let tempFire = find(this.lib.fires, function (o) {
          return o.id == acElement.surf_id;
        });
        let libFire = cloneDeep(tempFire);

        // Import surf from library if exists
        if (libFire != undefined) {
          if (libFire.surf.ramp != undefined) {
            let ramp = find(this.main.currentFdsScenario.fdsObject.ramps.ramps, function (o) {
              return o.id == libFire.surf.ramp.id;
            });

            // Import ramp from library
            if (ramp == undefined) {
              let tempRamp = find(this.lib.ramps, function (o) {
                return o.id == libFire.surf.ramp.id;
              });
              let libRamp = cloneDeep(tempRamp);

              if (libRamp != undefined) {
                // Copy to current fds scenario ramp
                this.main.currentFdsScenario.fdsObject.ramps.ramps.push(new Ramp(JSON.stringify(libRamp.toJSON())));
              }
            }
          }

          libFire.id = '';
          libFire.idAC = acElement.idAC;
          libFire.vent.xb = new Xb(JSON.stringify(acElement.vent.xb));
          //libFire.calcArea();
          libFire.vent.xyz = new Xyz(JSON.stringify(acElement.vent.xyz));
          // Import library surf into current scenario
          updatedElements.push(new Fire(JSON.stringify(libFire.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps));
        }
        else {
          // If it is not in library
          updatedElements.push(new Fire(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.ramps.ramps));
        }
      }
      else {
        let originalElement: Fire = sortedCurrentElements[res];

        // Rewrite properties and leave unchanged others
        originalElement.vent.xb = new Xb(JSON.stringify(acElement.vent.xb));
        originalElement.vent.xyz = new Xyz(JSON.stringify(acElement.vent.xyz));

        // Create new element based on new data
        let newElement = new Fire(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.ramps.ramps);
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'FIRE');

    return updatedElements;
  }

  /**
   * Transform CAD SLCF elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformSlcfs(acElements: object[], currentElements: Slcf[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);
    let updatedElements = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements);
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    each(sortedAcElements, (acElement) => {

      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');
      // If element not exists
      if (res == -1) {

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
          updatedElements.push(new Slcf(JSON.stringify(libSlcf.toJSON()), this.main.currentFdsScenario.fdsObject.specie.specs, undefined));
        }
        else {
          // If it is not in library
          acElement.id = '';
          updatedElements.push(new Slcf(JSON.stringify(acElement), this.main.currentFdsScenario.fdsObject.specie.specs, undefined));
        }
      }
      else {
        let originalElement: Slcf = sortedCurrentElements[res];

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));
        originalElement.direction = acElement.direction;
        originalElement.value = acElement.value;

        // Create new element based on new data
        let newElement = new Slcf(JSON.stringify(originalElement.toJSON()), this.main.currentFdsScenario.fdsObject.specie.specs, undefined);
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'SLCF');

    return updatedElements;
  }

  /**
   * Transform CAD DEVC elements
   * @param acElements CAD elements
   * @param currentElements Current fds elements
   */
  transformDevcs(acElements: object[], currentElements: Devc[]) {

    this.libraryService.getLibrary().subscribe(lib => this.lib = lib);
    let updatedElements = [];

    // Sort AC and current elements
    let sortedAcElements = this.sortAcElements(acElements);
    let sortedCurrentElements = this.sortCurrentElements(currentElements);

    // For each sorted AC element
    each(sortedAcElements, (acElement) => {

      // Check if element already exists
      let res = this.binaryIndexOf(acElement, sortedCurrentElements, 'idAC');
      // If element not exists
      if (res == -1) {

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
          updatedElements.push(new Devc(JSON.stringify(libDevc.toJSON()), undefined, this.main.currentFdsScenario.fdsObject.specie.specs, undefined));
        }
        else {
          // If it is not in library
          acElement.id = '';
          updatedElements.push(new Devc(JSON.stringify(acElement), undefined, this.main.currentFdsScenario.fdsObject.specie.specs));
        }
      }
      else {
        let originalElement: Devc = sortedCurrentElements[res];

        // Rewrite properties and leave unchanged others
        originalElement.xb = new Xb(JSON.stringify(acElement.xb));
        originalElement.xyz = new Xyz(JSON.stringify(acElement.xyz));

        // Create new element based on new data
        let newElement = new Devc(JSON.stringify(originalElement.toJSON()), undefined, this.main.currentFdsScenario.fdsObject.specie.specs, undefined);
        // Add element
        updatedElements.push(newElement);
        // Delete from current elements
        sortedCurrentElements.splice(res, 1);
      }
    });

    // Rewrite ids
    updatedElements = this.rewriteIds(updatedElements, 'DEVC');

    return updatedElements;
  }

}
