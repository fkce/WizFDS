import { Injectable, isDevMode } from '@angular/core';
import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { NotifierService } from 'angular-notifier';
import { FdsEntities } from '@enums/fds/entities/fds-entities';
import { IFds } from '@services/fds-object/fds-object';
import { forEach, forOwn, unset, toUpper, has, includes, isArray, join, cloneDeep, concat, replace, each, toInteger } from 'lodash';
import { sprintf } from 'sprintf-js';
import { Fire } from '@services/fds-object/fire/fire';
import { Surf } from '@services/fds-object/geometry/surf';
import { SurfVent } from '@services/fds-object/ventilation/surf-vent';
import { JetFan } from '@services/fds-object/ventilation/jet-fan';
import { Matl } from '@services/fds-object/geometry/matl';
import { Slcf } from '@services/fds-object/output/slcf';
import { Isof } from '@services/fds-object/output/isof';
import { Devc } from '@services/fds-object/output/devc';
import { SurfSpec } from '@services/fds-object/specie/surf-spec';
import { Spec } from '@services/fds-object/specie/spec';
import { Color } from '@services/fds-object/primitives';
import { Geom } from '@services/fds-object/geometry/geom';

@Injectable()
export class JsonFdsService {

  main: Main;
  fdsEntities: object = FdsEntities;
  fdsVisible: string[] = [
    'title', 'chid', 'nframes',
    't_begin', 't_end', 'dt_restart',
    'c', 'o', 'h', 'n', 'radiation_fraction', 'soot_yield', 'co_yield', 'heat_of_combustion',
    'hrrpua', 'color',
    'mw'
  ];
  fdsHidden: string[] = ['uuid'];
  rampInited: string[] = [];

  constructor(
    private mainService: MainService,
    private readonly notifierService: NotifierService
  ) {
    this.mainService.getMain().subscribe(main => this.main = main);
  }


  /**
   * Parse RAMP
   * @param steps 
   * @param id 
   */
  public parseRamp(steps: any[], id: string): string[] {
    let rampString: string[] = [];
    forOwn(steps, function (value, key) {
      rampString.push(sprintf("&RAMP ID='%s', T=%s, F=%s /", id, value['t'], value['f']));
    });
    return rampString;
  }

  /**
   * Check amper attributes and export
   * @param json 
   * @param amper 
   */
  public parseAmper(json: object, amper: string) {

    let result: string[] = [];
    //if(isDevMode()) {
    //  console.log('-------------------- &' + amper)
    //  console.log(json);
    //}

    // General loop
    forOwn(json, (value, key) => {

      // If there is no key in amper - unset
      if (!has(this.fdsEntities, [amper, key])) {
        unset(json, key);
        //if(isDevMode()) console.log('Has no attribute ' + key);
        return;
      }

      // Always hide
      if (includes(this.fdsHidden, key)) {
        unset(json, key);
        return;
      }

      // If value is empty
      if (value === '' && value != '0') {
        unset(json, key);
        return;
      }

      // Change color
      if (key == 'color') {
        if (value['value'] && value['value'] != '') {
          value = value['value'];
        }
        else {
          key = 'rgb';
          value = value['rgb'];
        }
      }

      let type = this.fdsEntities[amper][key]['type'];
      let defValue = this.fdsEntities[amper][key]['default'];

      // If default values - unset
      if (type == 'Logical') {
        //if(isDevMode()) console.log(key + ': Logical = ' + value);
        if (defValue[0] == value) {
          if (includes(this.fdsVisible, key)) {
            result.push(sprintf('%s=%s', toUpper(key), value == true ? '.TRUE.' : '.FALSE.'));
            return
          }
          unset(json, key);
          return;
        }
        else {
          result.push(sprintf('%s=%s', toUpper(key), value == true ? '.TRUE.' : '.FALSE.'));
          return;
        }
      }

      else if (type == 'Character') {
        //if(isDevMode()) console.log(key + ': Character = ' + value);
        if (toUpper(defValue[0]) == toUpper(value)) {
          if (includes(this.fdsVisible, key)) {
            result.push(sprintf("%s='%s'", toUpper(key), value));
            return
          }
          unset(json, key);
          return;
        }
        else {
          if (value == '') {
            unset(json, key);
            return;
          }
          else {
            //value = toUpper(value);
            result.push(sprintf("%s='%s'", toUpper(key), value));
            return;
          }
        }
      }

      else if (type == 'Integer') {
        //if(isDevMode()) console.log(key + ': Real = ' + value);
        if (defValue[0] === value) {
          if (includes(this.fdsVisible, key)) {
            result.push(sprintf('%s=%s', toUpper(key), value));
            return
          }
          unset(json, key);
          return;
        }
        else {
          let val;
          value == null ? unset(json, key) : val = toUpper(value);
          result.push(sprintf('%s=%s', toUpper(key), val));
          return;
        }
      }

      else if (type == 'Real') {
        //if(isDevMode()) console.log(key + ': Real = ' + value);
        if (defValue[0] == value) {
          if (includes(this.fdsVisible, key)) {
            result.push(sprintf('%s=%s', toUpper(key), value));
            return
          }
          unset(json, key);
          return;
        }
        else {
          let val;
          value == null ? unset(json, key) : val = toUpper(value);
          result.push(sprintf('%s=%s', toUpper(key), val));
          return;
        }
      }

      else if (type == 'RealSextuplet') {
        //if(isDevMode()) console.log(key + ': RealSextuplet = ' + value);
        if (key == 'xb') {
          result.push(sprintf('%s=%s,%s, %s,%s, %s,%s', toUpper(key), value['x1'], value['x2'], value['y1'], value['y2'], value['z1'], value['z2']));
          return;
        }
      }

      else if (type == 'RealTriplet') {
        //if(isDevMode()) console.log(key + ': RealTriplet = ' + value);
        if (key == 'xyz' && value['x'] != undefined) {
          result.push(sprintf('%s=%s,%s,%s', toUpper(key), value['x'], value['y'], value['z']));
        }
        else if (defValue[0] == value[0] && defValue[1] == value[1] && defValue[2] == value[2]) {
          if (includes(this.fdsVisible, key)) {
            result.push(sprintf('%s=%s,%s,%s', toUpper(key), value[0], value[1], value[2]));
            return
          }
          unset(json, key);
          return;
        }
        else {
          result.push(sprintf('%s=%s,%s,%s', toUpper(key), value[0], value[1], value[2]));
        }
        return;
      }

      else if (type == 'IntegerTriplet') {
        //if(isDevMode()) console.log(key + ': IntegerTriplet = ' + value);
        result.push(sprintf('%s=%s,%s,%s', toUpper(key), value[0], value[1], value[2]));
        return;
      }

      else if (type == 'CharacterDoublet') {
        //if(isDevMode()) console.log(key + ': CharacterDoublet = ' + value);
        result.push(sprintf("%s='%s','%s'", toUpper(key), value[0], value[1]));
        return;
      }

      else if (type == 'CharacterTriplet') {
        //if(isDevMode()) console.log(key + ': CharacterTriplet = ' + value);
        result.push(sprintf("%s='%s','%s','%s'", toUpper(key), value[0], value[1], value[2]));
        return;
      }

      else if (type == 'CharacterSextuplet') {
        //if(isDevMode()) console.log(key + ': CharacterSextuplet = ' + value);
        result.push(sprintf("%s='%s','%s','%s','%s','%s','%s'", toUpper(key), value[0], value[1], value[2], value[3], value[4], value[5]));
        return;
      }

      else if (type == 'CharacterArray') {
        //if(isDevMode()) console.log(key + ': CharacterDoublet = ' + value);
        let elements = '';
        each(value, (val) => {
          // HERE lenght
          elements += (value[value['length'] - 1] == val) ? val : val + ', ';
        });
        result.push(sprintf("%s='%s'", toUpper(key), elements));
        return;
      }

      else if (type == 'Char.Quint') {
        //if(isDevMode()) console.log(key + ': Char.Quint = ' + value);
        result.push(sprintf("%s(1:%s)='%s'", toUpper(key), value['length'], join(value, "','")));
        return;
      }

      else {
        //if(isDevMode()) console.log(key + ': ' + this.fdsEntities[amper][key]['type'] + ' = ' + value);
        if (isArray(value)) {
          result.push(sprintf('%s=%s', toUpper(key), join(value, ',')));
          return;
        }
        else {
          result.push(sprintf('%s=%s', toUpper(key), value));
          return;
        }
      }
    });

    if (result.length > 0) {
      return join(result, ', ');
    }
    else {
      return;
    }
  }

  /**
   * Parse simple ampers
   * @param amper 
   * @param type 
   */
  public simpleAmper(amper: any[], type: string, path?: string): string[] {
    let outputString: string[] = [];
    forEach(amper, (o) => {
      //console.log(o);
      let parsed = path != undefined ? this.parseAmper(o[path].toJSON(), type) : this.parseAmper(o.toJSON(), type);
      if (parsed) outputString.push(sprintf('&' + toUpper(type) + ' %s /', parsed));
    });
    if (outputString.length > 0) return outputString;
    else return Array();
  }

  /**
   * Parse FIRE ampers
   * @param fires 
   * @param ramps 
   */
  public fireAmper(fires: Fire[]) {
    let fireString: string[] = [];

    forEach(fires, (fire) => {

      fire.surf.id = fire.id;
      // Constant HRR
      if (fire.surf.fire_type == "constant_hrr") {

        let vent = fire.vent.toJSON();
        unset(vent, 'xyz');
        let parsedVent = this.parseAmper(vent, 'vent');
        if (parsedVent) fireString.push(sprintf("&VENT SURF_ID='%s', %s /", fire.id, parsedVent));

        let hrr = cloneDeep(fire.surf.hrr.toJSON());
        unset(hrr, 'spread_rate');
        unset(hrr, 'tau_q');
        fire.surf.ramp = undefined;

        let parsedHrr = this.parseAmper(hrr, 'surf');
        let parsedSurf = this.parseAmper(fire.surf.toJSON(), 'surf');

        if (parsedHrr && parsedSurf) fireString.push(sprintf('&SURF %s, %s /', parsedSurf, parsedHrr));
      }
      // HRR with RAMP || TAU_Q
      else if (fire.surf.fire_type == "time_dependent_hrrpua") {

        let vent = cloneDeep(fire.vent.toJSON());
        unset(vent, 'xyz');
        let parsedVent = this.parseAmper(vent, 'vent');
        if (parsedVent) fireString.push(sprintf("&VENT SURF_ID='%s', %s /", fire.id, parsedVent));

        let hrr = cloneDeep(fire.surf.hrr.toJSON());
        unset(hrr, 'spread_rate');
        if (fire.surf.hrr.time_function == 'ramp') {
          if (fire.surf.ramp == undefined) unset(hrr, 'ramp_q');
          unset(hrr, 'tau_q');
        }
        else if (fire.surf.hrr.time_function == 'tauq') {
          fire.surf.ramp = undefined;
        }
        let parsedHrr = this.parseAmper(hrr, 'surf');
        let parsedSurf = this.parseAmper(fire.surf.toJSON(), 'surf');
        if (parsedHrr && parsedSurf) fireString.push(sprintf('&SURF %s, %s /', parsedSurf, parsedHrr));

        // Add ramp if not exists already
        if (fire.surf.ramp != undefined) {
          if (fire.surf.hrr.time_function == 'ramp' && !includes(this.rampInited, fire.surf.ramp.id)) {
            fireString = concat(fireString, this.parseRamp(fire.surf.ramp.steps, fire.surf.ramp.id));
            this.rampInited.push(fire.surf.ramp.id);
          }
        }
      }
      // HRR with SPREAD_RATE
      else if (fire.surf.fire_type == "radially_spreading") {

        let vent = cloneDeep(fire.vent.toJSON());
        vent['spread_rate'] = fire.surf.hrr.spread_rate;
        let parsedVent = this.parseAmper(vent, 'vent');
        if (parsedVent) fireString.push(sprintf("&VENT SURF_ID='%s', %s /", fire.id, parsedVent));

        let hrr = cloneDeep(fire.surf.hrr.toJSON());
        unset(hrr, 'tau_q');
        unset(hrr, 'spread_rate');
        fire.surf.ramp = undefined;

        let parsedHrr = this.parseAmper(hrr, 'surf');
        let parsedSurf = this.parseAmper(fire.surf.toJSON(), 'surf');
        if (parsedHrr && parsedSurf) fireString.push(sprintf('&SURF %s, %s /', parsedSurf, parsedHrr));
      }
      fireString.push('');
    });

    if (fireString.length > 0) return fireString;
    else return Array();
  }

  /**
   * Parse vent surfs 
   * @param surfs 
   */
  public surfVentAmper(surfs: SurfVent[]): string[] {

    let surfString: string[] = [];

    forEach(surfs, (o) => {
      let surf = cloneDeep(o.toJSON());
      if (!surf.isActiveHeater) unset(surf, 'tmp_front');
      if (!surf.isActiveLouver) unset(surf, 'vel_t');
      let parsedSurf = this.parseAmper(surf, 'surf');
      let parsedFlow = this.parseAmper(o.toJSON().flow, 'surf');
      if (parsedSurf) surfString.push(sprintf("&SURF %s, %s /", parsedSurf, parsedFlow));

      // RAMP
      if (o.ramp != undefined && !includes(this.rampInited, o.ramp.id)) {
        surfString = concat(surfString, this.parseRamp(o.ramp.steps, o.ramp.id));
        this.rampInited.push(o.ramp.id);
      }
    });

    if (surfString.length > 0) return surfString;
    else return Array();
  }

  /**
   * Parse jetfans 
   * @param jetfans 
   */
  public jetfanAmper(jetfans: JetFan[]): string[] {

    let jetfanString: string[] = [];

    forEach(jetfans, (jetfan: JetFan) => {

      // RAMP
      if (jetfan.ramp != undefined && !includes(this.rampInited, jetfan.ramp.id)) {
        jetfanString = concat(jetfanString, this.parseRamp(jetfan.ramp.steps, jetfan.ramp.id));
        this.rampInited.push(jetfan.ramp.id);
      }

      // DEVC
      if (jetfan.devc['active']) {
        let devc = cloneDeep(jetfan.toJSON().devc);
        devc['id'] = jetfan.id + '_devc';
        devc['quantity'] = 'TEMPERATURE';
        devc['initial_state'] = true;
        devc['xyz'] = [jetfan.xb.x1 + (jetfan.xb.x2 - jetfan.xb.x1) / 2, jetfan.xb.y1 + (jetfan.xb.y2 - jetfan.xb.y1) / 2, jetfan.xb.z1 - 0.05];
        let parsedDevc = this.parseAmper(devc, 'devc');
        if (parsedDevc) jetfanString.push(sprintf("&DEVC %s /", parsedDevc));
      }

      // OBST
      let obst: any = cloneDeep(jetfan.toJSON());
      obst['color'] = jetfan.color;
      if (jetfan.devc['active']) obst['devc_id'] = jetfan.id + '_devc';
      let parsedObst = this.parseAmper(obst, 'obst');
      if (parsedObst) jetfanString.push(sprintf("&OBST %s /", parsedObst));

      // VENT IN
      let ventIn: any = cloneDeep(jetfan.toJSON());
      ventIn['id'] = jetfan.id + '_vent_in';
      ventIn['surf_id'] = 'HVAC';
      ventIn['color'] = new Color(JSON.stringify({}), 'BLUE');

      // VENT OUT
      let ventOut: any = cloneDeep(jetfan.toJSON());
      ventOut['id'] = jetfan.id + '_vent_out';
      ventOut['surf_id'] = 'HVAC';
      ventOut['color'] = new Color(JSON.stringify({}), 'RED');
      if (jetfan.louver['active']) {
        ventOut['uvw'] = [ventOut.louver.tangential1, ventOut.louver.tangential2, ventOut.louver.tangential3];
      }

      if (jetfan.direction == '+x') {
        ventIn.xb['x2'] = ventIn.xb['x1'];
        ventOut.xb['x1'] = ventOut.xb['x2'];
      }
      else if (jetfan.direction == '-x') {
        ventIn.xb['x1'] = ventIn.xb['x2'];
        ventOut.xb['x2'] = ventOut.xb['x1'];
      }

      if (jetfan.direction == '+y') {
        ventIn.xb['y2'] = ventIn.xb['y1'];
        ventOut.xb['y1'] = ventOut.xb['y2'];
      }
      else if (jetfan.direction == '-y') {
        ventIn.xb['y1'] = ventIn.xb['y2'];
        ventOut.xb['y2'] = ventOut.xb['y1'];
      }

      if (jetfan.direction == '+z') {
        ventIn.xb['z2'] = ventIn.xb['z1'];
        ventOut.xb['z1'] = ventOut.xb['z2'];
      }
      else if (jetfan.direction == '-z') {
        ventIn.xb['z1'] = ventIn.xb['z2'];
        ventOut.xb['z2'] = ventOut.xb['z1'];
      }

      let parsedVentIn = this.parseAmper(ventIn, 'vent');
      if (parsedVentIn) jetfanString.push(sprintf("&VENT %s /", parsedVentIn));

      let parsedVentOut = this.parseAmper(ventOut, 'vent');
      if (parsedVentOut) jetfanString.push(sprintf("&VENT %s /", parsedVentOut));

      let hvacIn = {};
      hvacIn['id'] = jetfan.id + '_hvac_in';
      hvacIn['type_id'] = "NODE";
      hvacIn['duct_id'] = [jetfan.id + '_hvac_duct'];
      hvacIn['vent_id'] = jetfan.id + '_vent_in';

      let parsedHvacIn = this.parseAmper(hvacIn, 'hvac');
      if (parsedHvacIn) jetfanString.push(sprintf("&HVAC %s /", parsedHvacIn));

      let hvacOut = {};
      hvacOut['id'] = jetfan.id + '_hvac_out';
      hvacOut['type_id'] = "NODE";
      hvacOut['duct_id'] = [jetfan.id + '_hvac_duct'];
      hvacOut['vent_id'] = jetfan.id + '_vent_out';

      let parsedHvacOut = this.parseAmper(hvacOut, 'hvac');
      if (parsedHvacOut) jetfanString.push(sprintf("&HVAC %s /", parsedHvacOut));

      let hvacDuct = {};
      hvacDuct['id'] = jetfan.id + '_hvac_duct';
      hvacDuct['type_id'] = "DUCT";
      hvacDuct['node_id'] = [hvacIn['id'], hvacOut['id']];

      jetfan.flow.type == 'volumeFlow' ? hvacDuct['volume_flow'] = jetfan.flow.volume_flow : hvacDuct['mass_flow'] = jetfan.flow.mass_flow;

      if (jetfan.area['type'] == 'area') {
        hvacDuct['area'] = jetfan.area['area'];
      }
      else if (jetfan.area['type'] == 'perimeter') {
        hvacDuct['permiter'] = jetfan.area['permiter'];
      }
      else if (jetfan.area['type'] == 'diameter') {
        hvacDuct['diameter'] = jetfan.area['diameter'];
      }

      if (jetfan.ramp != undefined && jetfan.ramp.id != "") {
        hvacDuct['ramp_id'] = jetfan.ramp.id;
      }

      let parsedDuct = this.parseAmper(hvacDuct, 'hvac');
      if (parsedDuct) jetfanString.push(sprintf("&HVAC %s /", parsedDuct));

    });

    if (jetfanString.length > 0) return jetfanString;
    else return Array();
  }

  /**
   * Parse vent surfs 
   * @param matls 
   */
  public matlAmper(matls: Matl[]): string[] {

    let matlString: string[] = [];

    forEach(matls, (o) => {
      let matl = cloneDeep(o.toJSON());

      let parsedMatl = this.parseAmper(matl, 'matl');
      if (parsedMatl) matlString.push(sprintf("&MATL %s /", parsedMatl));

      // RAMP
      if (o.conductivity_ramp != undefined && !includes(this.rampInited, o.conductivity_ramp.id)) {
        matlString = concat(matlString, this.parseRamp(o.conductivity_ramp.steps, o.conductivity_ramp.id));
        this.rampInited.push(o.conductivity_ramp.id);
      }
      if (o.specific_heat_ramp != undefined && !includes(this.rampInited, o.specific_heat_ramp.id)) {
        matlString = concat(matlString, this.parseRamp(o.specific_heat_ramp.steps, o.specific_heat_ramp.id));
        this.rampInited.push(o.specific_heat_ramp.id);
      }
    });

    if (matlString.length > 0) return matlString;
    else return Array();
  }

  /**
   * Parse surfs 
   * @param surfs 
   */
  public surfAmper(surfs: Surf[]): string[] {

    let surfString: string[] = [];

    forEach(surfs, (o) => {
      let surf = cloneDeep(o.toJSON());

      let parsedSurf = this.parseAmper(surf, 'surf');

      if (o.layers.length > 0) {
        let matls: string[] = [];
        let thickness: number[] = [];

        forEach(o.layers, (layer, layerIndex) => {
          let fractions: number[] = [];
          thickness.push(layer.thickness);

          forEach(layer.materials, (material, materialIndex) => {
            if (material.material != undefined) {
              matls.push(sprintf(" MATL_ID(%s,%s)='%s'", layerIndex + 1, materialIndex + 1, material.material.id))
              fractions.push(material.fraction);
            }
          });

          if (fractions.length > 1) {
            matls.push(sprintf(" MATL_MASS_FRACTION=(%s,1:%s)=%s", layerIndex + 1, fractions.length, join(fractions, ",")));
          }

        });
        if (matls.length > 0) {
          surfString.push(sprintf("&SURF %s,%s, THICKNESS=%s /", parsedSurf, join(matls, ','), join(thickness, ',')));
        }
        else {
          surfString.push(sprintf("&SURF %s, THICKNESS=%s /", parsedSurf, join(thickness, ',')));
        }
        return;

      }
      if (parsedSurf) surfString.push(sprintf("&SURF %s /", parsedSurf));

    });

    if (surfString.length > 0) return surfString;
    else return Array();
  }

  /**
   * Parse geoms 
   * @param geoms 
   */
  public geomAmper(geoms: Geom[]): string[] {

    let geomString: string[] = [];

    forEach(geoms, (o) => {
      let geom = cloneDeep(o.toJSON());

      console.log(geom);
      let verts: string = "\n\tVERTS=";
      let faces: string = "\tFACES=";

      // Create verts & faces with linebreaks
      if (geom['verts'] && geom['faces']) {
        forEach(geom['verts'], (vert, index: number) => {
          if (index == 0) {
            verts = verts + sprintf("%s, %s, %s,\n", vert[0], vert[1], vert[2]);
          }
          else {
            verts = verts + sprintf("\t\t%s, %s, %s,\n", vert[0], vert[1], vert[2]);
          }
        });

        forEach(geom['faces'], (face, index: number) => {
          if (index == 0) {
            faces = faces + sprintf("%s, %s, %s, %s,\n", face[0], face[1], face[2], 1);
          }
          else {
            faces = faces + sprintf("\t\t%s, %s, %s, %s,\n", face[0], face[1], face[2], 1);
          }
        });
      }

      unset(geom, 'verts');
      unset(geom, 'faces');

      let parsedGeom = this.parseAmper(geom, 'geom');
      if (parsedGeom) geomString.push(sprintf("&GEOM %s, %s%s/", parsedGeom, verts, faces));
    });

    if (geomString.length > 0) return geomString;
    else return Array();
  }
  /**
   * Parse spec 
   * @param specs 
   */
  public specAmper(specs: Spec[]): string[] {

    let specString: string[] = [];

    forEach(specs, (o) => {
      let spec = cloneDeep(o.toJSON());
      let lumpedSpecString: string[] = [];
      let i = 1;
      if (o.lumpedSpecs.length > 0) {
        forEach(o.lumpedSpecs, (lumpedSpec) => {
          lumpedSpecString.push(sprintf(" SPEC_ID(%s)='%s'", i, lumpedSpec.spec.id));
          i++;
        });
      }
      let parsedSpec = this.parseAmper(spec, 'spec');

      (parsedSpec && lumpedSpecString.length > 0) ? specString.push(sprintf("&SPEC %s,%s /", parsedSpec, join(lumpedSpecString, ','))) : specString.push(sprintf("&SPEC %s /", parsedSpec));

    });

    if (specString.length > 0) return specString;
    else return Array();
  }

  /**
   * Parse specsurfs 
   * @param specsurfs 
   */
  public specSurfAmper(surfs: SurfSpec[]): string[] {

    let specSurfString: string[] = [];

    forEach(surfs, (o) => {
      let surf = cloneDeep(o.toJSON());
      let specsString: string[] = [];
      let i = 1;

      if (o.specieFlowType == 'massFlux') {
        unset(surf, 'vel');
        unset(surf, 'volume_flow');
        unset(surf, 'mass_flux_total');
        unset(surf, 'specieMassFraction');
        forEach(o.massFlux, (massFlux) => {
          specsString.push(sprintf(" SPEC_ID(%s)='%s', MASS_FLUX(%s)=%s", i, massFlux.spec.id, i, massFlux.mass_flux));
          i++;
        });
      }
      else if (o.specieFlowType == 'massFraction') {
        if (o.specieMassFractionFlowType == 'velocity') {
          unset(surf, 'volume_flow');
          unset(surf, 'mass_flux_total');
        }
        else if (o.specieMassFractionFlowType == 'volumeFlow') {
          unset(surf, 'vel');
          unset(surf, 'mass_flux_total');
        }
        else if (o.specieMassFractionFlowType == 'massFluxTotal') {
          unset(surf, 'vel');
          unset(surf, 'volume_flow');
        }
        unset(surf, 'specieMassFlux');
        forEach(o.massFlux, (massFraction) => {
          specsString.push(sprintf(" SPEC_ID(%s)='%s', MASS_FRACTION(%s)=%s", i, massFraction.spec.id, i, massFraction.mass_flux));
          i++;
        });

      }

      let parsedSurf = this.parseAmper(surf, 'surf');

      if (parsedSurf) specSurfString.push(sprintf("&SURF %s,%s /", parsedSurf, join(specsString, ',')));

      // RAMP
      if (o.ramp != undefined && !includes(this.rampInited, o.ramp.id)) {
        specSurfString = concat(specSurfString, this.parseRamp(o.ramp.steps, o.ramp.id));
        this.rampInited.push(o.ramp.id);
        specSurfString.push('');
      }
    });

    if (specSurfString.length > 0) return specSurfString;
    else return Array();
  }
  /**
   * Parse slcfs 
   * @param slcfs 
   */
  public slcfAmper(slcfs: Slcf[]): string[] {

    let slcfString: string[] = [];

    forEach(slcfs, (o) => {
      let slcf = cloneDeep(o.toJSON());
      let isXb = slcf['isXb'];

      forEach(o.quantities, (quantity) => {
        if (!isXb) {
          if (o.direction == 'x') slcf['pbx'] = o.value;
          if (o.direction == 'y') slcf['pby'] = o.value;
          if (o.direction == 'z') slcf['pbz'] = o.value;
          unset(slcf, 'xb');
        }
        slcf['quantity'] = quantity.quantity;

        let parsedSlcf = this.parseAmper(slcf, 'slcf');
        if (parsedSlcf) slcfString.push(sprintf("&SLCF %s /", parsedSlcf));
        unset(slcf, 'vector');
      });
    });

    if (slcfString.length > 0) return slcfString;
    else return Array();
  }

  /**
   * Parse isofs 
   * @param isofs 
   */
  public isofAmper(isofs: Isof[]): string[] {

    let isofString: string[] = [];

    forEach(isofs, (o) => {
      let isof = cloneDeep(o.toJSON());
      let valueString: string[] = [];

      if (o.quantity != undefined) {
        isof['quantity'] = o.quantity.quantity;
      }
      else {
        unset(isof, 'quantity');
      }

      forEach(o.values, (value, valueIndex) => {
        valueString.push(sprintf(' VALUE(%s)=%s', valueIndex + 1, value));
      });
      let parsedIsof = this.parseAmper(isof, 'isof');
      if (parsedIsof) isofString.push(sprintf('&ISOF %s,%s /', parsedIsof, join(valueString, ',')));
    });

    if (isofString.length > 0) return isofString;
    else return Array();
  }

  /**
   * Parse devcs 
   * @param devcs 
   */
  public devcAmper(devcs: Devc[]): string[] {

    let devcString: string[] = [];

    forEach(devcs, (o) => {
      let devc = cloneDeep(o.toJSON());

      if (o.quantity != undefined) {
        devc['quantity'] = o.quantity.quantity;
      }
      else {
        unset(devc, 'quantity');
      }

      if (o.statistics != undefined) {
        devc['statistics'] = o.statistics.statistics;
      }
      else {
        unset(devc, 'statistics');
      }

      if (o.geometrical_type == 'point') {
        unset(devc, 'xb');
      }
      else if (o.geometrical_type == 'plane' || o.geometrical_type == 'volume' || o.geometrical_type == 'linear') {
        unset(devc, 'xyz');
      }

      let parsedDevc = this.parseAmper(devc, 'devc');
      if (parsedDevc) devcString.push(sprintf('&DEVC %s /', parsedDevc));
    });

    if (devcString.length > 0) return devcString;
    else return Array();
  }

  /**
   * Convert json to fds text file
   * @param fds 
   */
  public json2fds(fds: IFds): string[] {

    let fdsObject = cloneDeep(fds);
    let fdsInput: string[] = [];
    this.rampInited = [];

    fdsInput = concat(fdsInput, Array('/** User-defined input'));
    fdsInput.push(replace(this.main.currentFdsScenario.fdsFile, '/ ', '/\n'));
    fdsInput = concat(fdsInput, Array('**/'));
    fdsInput.push('');

    fdsInput = concat(fdsInput, Array('# ---- General ----'));
    fdsInput = concat(fdsInput, this.simpleAmper(Array(fdsObject.general.head), 'head'));
    fdsInput = concat(fdsInput, this.simpleAmper(Array(fdsObject.general.init), 'init'));
    fdsInput = concat(fdsInput, this.simpleAmper(Array(fdsObject.general.time), 'time'));
    fdsInput = concat(fdsInput, this.simpleAmper(Array(fdsObject.general.misc), 'misc'));
    fdsInput.push('');

    if (fdsObject.geometry.meshes.length > 0) {
      fdsInput = concat(fdsInput, Array('# ---- Mesh ----'));
      fdsInput = concat(fdsInput, this.simpleAmper(fdsObject.geometry.meshes, 'mesh'));
      fdsInput.push('');
    }

    if (fdsObject.geometry.opens.length > 0) {
      fdsInput = concat(fdsInput, Array('# ---- Open ----'));
      fdsInput = concat(fdsInput, this.simpleAmper(fdsObject.geometry.opens, 'vent'));
      fdsInput.push('');
    }

    if ((fdsObject.fires.combustion.turnOnReaction || this.simpleAmper(Array(fdsObject.fires.combustion), 'radi').length > 0) && (fdsObject.fires.fuels.length > 0 || fdsObject.fires.fires.length > 0 || this.simpleAmper(Array(fdsObject.fires.combustion), 'radi').length > 0)) {
      fdsInput = concat(fdsInput, Array('# ---- Fire ----'));
    }
    if (fdsObject.fires.fuels.length > 0 || this.simpleAmper(Array(fdsObject.fires.combustion), 'radi').length > 0) {
      if (fdsObject.fires.combustion.turnOnReaction) {
        fdsInput = concat(fdsInput, this.simpleAmper(fdsObject.fires.fuels, 'reac'));
      }
      fdsInput = concat(fdsInput, this.simpleAmper(Array(fdsObject.fires.combustion), 'radi'));
      fdsInput.push('');
    }
    if (fdsObject.fires.combustion.turnOnReaction && (fdsObject.fires.fires.length > 0)) {
      fdsInput = concat(fdsInput, Array('## ---- Fires ----'));
      fdsInput = concat(fdsInput, this.fireAmper(fdsObject.fires.fires));
    }

    if (fdsObject.ventilation.jetfans.length > 0 || fdsObject.ventilation.surfs.length > 0 || fdsObject.ventilation.vents.length > 0) {
      fdsInput = concat(fdsInput, Array('# ---- Ventilation ----'));
    }
    if (fdsObject.ventilation.surfs.length > 0 || fdsObject.ventilation.vents.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Basic ----'));
      fdsInput = concat(fdsInput, this.simpleAmper(fdsObject.ventilation.vents, 'vent'));
      fdsInput = concat(fdsInput, this.surfVentAmper(fdsObject.ventilation.surfs));
      fdsInput.push('');
    }
    if (fdsObject.ventilation.jetfans.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Jetfans ----'));
      fdsInput = concat(fdsInput, this.jetfanAmper(fdsObject.ventilation.jetfans));
      fdsInput.push('');
    }

    if (fdsObject.specie.specs.length > 0 || fdsObject.specie.surfs.length > 0 || fdsObject.specie.vents.length > 0) {
      fdsInput = concat(fdsInput, Array('# ---- Specie ----'));
    }
    if (fdsObject.specie.specs.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Specs ----'));
      fdsInput = concat(fdsInput, this.specAmper(fdsObject.specie.specs));
      fdsInput.push('');
    }
    if (fdsObject.specie.surfs.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Surfs ----'));
      fdsInput = concat(fdsInput, this.specSurfAmper(fdsObject.specie.surfs));
      fdsInput.push('');
    }
    if (fdsObject.specie.vents.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Vents ----'));
      fdsInput = concat(fdsInput, this.simpleAmper(fdsObject.specie.vents, 'vent'));
      fdsInput.push('');
    }

    fdsInput = concat(fdsInput, Array('# ---- Output ----'));
    fdsInput = concat(fdsInput, Array('## ---- General ----'));
    fdsInput = concat(fdsInput, this.simpleAmper(Array(fdsObject.output.general), 'dump'));
    fdsInput.push('');
    if (fdsObject.output.bndfs.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Boundary ----'));
      fdsInput = concat(fdsInput, this.simpleAmper(fdsObject.output.bndfs, 'bndf'));
      fdsInput.push('');
    }

    if (fdsObject.output.slcfs.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Slice ----'));
      fdsInput = concat(fdsInput, this.slcfAmper(fdsObject.output.slcfs));
      fdsInput.push('');
    }
    if (fdsObject.output.isofs.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Isosurface ----'));
      fdsInput = concat(fdsInput, this.isofAmper(fdsObject.output.isofs));
      fdsInput.push('');
    }
    if (fdsObject.output.devcs.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Device ----'));
      fdsInput = concat(fdsInput, this.devcAmper(fdsObject.output.devcs));
      fdsInput.push('');
    }

    fdsInput = concat(fdsInput, Array('# ---- Geometry ----'));
    fdsInput = concat(fdsInput, Array('## ---- Material ----'));
    fdsInput = concat(fdsInput, this.matlAmper(fdsObject.geometry.matls));
    fdsInput.push('');
    if (fdsObject.geometry.surfs.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Surface ----'));
      fdsInput = concat(fdsInput, this.surfAmper(fdsObject.geometry.surfs));
      fdsInput.push('');
    }
    if (fdsObject.geometry.obsts.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Obstruction ----'));
      fdsInput = concat(fdsInput, this.simpleAmper(fdsObject.geometry.obsts, 'obst'));
      fdsInput.push('');
    }
    if (fdsObject.geometry.holes.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Hole ----'));
      fdsInput = concat(fdsInput, this.simpleAmper(fdsObject.geometry.holes, 'hole'));
      fdsInput.push('');
    }
    if (fdsObject.geometry.geoms.length > 0) {
      fdsInput = concat(fdsInput, Array('## ---- Complex geometry ----'));
      fdsInput = concat(fdsInput, this.geomAmper(fdsObject.geometry.geoms));
      fdsInput.push('');
    }

    fdsInput = concat(fdsInput, Array('&TAIL /'));

    return fdsInput;
  }


}
