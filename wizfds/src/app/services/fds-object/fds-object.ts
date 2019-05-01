import { FdsEntities } from '../../enums/fds/entities/fds-entities';
import { FdsEnums } from '../../enums/fds/enums/fds-enums';
import { General } from './general/general';
import { Obst } from './geometry/obst';
import { Hole } from './geometry/hole';
import { Open } from './geometry/open';
import { Matl } from './geometry/matl';
import { Mesh } from './geometry/mesh';
import { Surf } from './geometry/surf';
import { SurfVent } from './ventilation/surf-vent';
import { Vent } from './ventilation/vent';
import { JetFan } from './ventilation/jet-fan';
import { Ramp } from './ramp/ramp';
import { Part } from './particle/part';
import { Spec } from './specie/spec';
import { Fire } from './fire/fire';
import { Combustion } from './fire/combustion';
import { Devc } from './output/devc';
import { Prop } from './output/prop';
import { Bndf } from './output/bndf';
import { Slcf } from './output/slcf';
import { Isof } from './output/isof';
import { Ctrl } from './output/ctrl';
import { get, map, toNumber, find, filter, includes, forEach } from 'lodash';
import { Fuel } from './fire/fuel';
import { quantities } from '../../enums/fds/enums/fds-enums-quantities';
import { Dump } from './output/dump';
import { SurfSpec } from './specie/surf-spec';
import { VentSpec } from './specie/vent';
import { Geom } from './geometry/geom';

export interface IFds {
  general: General,
  geometry: { obsts: Obst[], holes: Hole[], opens: Open[], matls: Matl[], meshes: Mesh[], surfs: Surf[], geoms: Geom[] },
  ventilation: { surfs: SurfVent[], vents: Vent[], jetfans: JetFan[] },
  ramps: { ramps: Ramp[] },
  particle: { parts: Part[] },
  specie: { specs: Spec[], surfs: SurfSpec[], vents: VentSpec[] }, 
  fires: { fires: Fire[], combustion: Combustion, fuels: Fuel[] };
  output: { general: Dump, devcs: Devc[], props: Prop[], bndfs: Bndf[], slcfs: Slcf[], isofs: Isof[], ctrls: Ctrl[] },
}

export class Fds {

  general: General;
  geometry = { obsts: [], holes: [], opens: [], matls: [], meshes: [], surfs: [], geoms: [] };
  ventilation = { surfs: [], vents: [], jetfans: [] };
  ramps = { ramps: [] };
  particle = { parts: [] };
  specie = { specs: [], surfs: [], vents: [] } 
  fires = { fires: [], combustion: new Combustion(JSON.stringify({})), fuels: [] };
  output = { general: new Dump(JSON.stringify({})), devcs: [], props: [], bndfs: [], slcfs: [], isofs: [], ctrls: [] };

  constructor(jsonString: string) {

    let base: IFds;
    base = <IFds>JSON.parse(jsonString);

    // Create general
    this.general = get(base, 'general') === undefined ? new General("{}") : new General(JSON.stringify(base.general));

    // Create ramps
    this.ramps = {
      ramps: (get(base, 'ramps.ramps') === undefined ? [] : map(base.ramps.ramps, (ramp) => {
        return new Ramp(JSON.stringify(ramp));
      }))
    };

    // Create props
    this.output.props = get(base, 'output.props') === undefined ? [] : map(base.output.props, (prop) => {
      return new Prop(JSON.stringify(prop), this.ramps.ramps, this.particle.parts);
    });

    // Create parts
    this.particle.parts = get(base, 'parts.parts') === undefined ? [] : map(base.particle.parts, (part) => {
      return new Part(JSON.stringify(part));
    });

    // Create species & injection
    this.specie.specs = get(base, 'specie.specs') === undefined ? [] : map(base.specie.specs, function (spec) {
      return new Spec(JSON.stringify(spec));
    });
    // Update lumped species in specs
    forEach(this.specie.specs, (spec: Spec) => {
      let baseSpec = find(base.specie.specs, (o: Spec) => {
        return o.id == spec.id;
      });
      if (baseSpec.lumpedSpecs.length > 0) {
        spec.lumpedSpecs = map(baseSpec.lumpedSpecs, (baseLumpedSpec) => {
          let tmpSpec = find(this.specie.specs, (currentSpec: Spec) => {
            return currentSpec.id == baseLumpedSpec['spec_id'];
          });
          return { spec: tmpSpec, mass_fraction: baseLumpedSpec.mass_fraction, volume_fraction: baseLumpedSpec.volume_fraction };
        });
      }
    });
    // Create surfs & vents
    this.specie.surfs = get(base, 'specie.surfs') === undefined ? [] : map(base.specie.surfs, (surf) => {
      return new SurfSpec(JSON.stringify(surf), this.ramps.ramps, this.specie.specs);
    });
    this.specie.vents = get(base, 'specie.vents') === undefined ? [] : map(base.specie.vents, (vent) => {
      return new VentSpec(JSON.stringify(vent), this.specie.surfs);
    });

    // Create devices after props, parts and species initialization
    this.output.devcs = get(base, 'output.devcs') === undefined ? [] : map(base.output.devcs, (devc) => {
      return new Devc(JSON.stringify(devc), this.output.props, this.specie.specs, this.particle.parts);
    });

    // Create geometry objects
    this.geometry.meshes = get(base, 'geometry.meshes') === undefined ? [] : map(base.geometry.meshes, (mesh) => {
      return new Mesh(JSON.stringify(mesh));
    });
    this.geometry.opens = get(base, 'geometry.opens') === undefined ? [] : map(base.geometry.opens, (open) => {
      return new Open(JSON.stringify(open));
    });
    this.geometry.matls = get(base, 'geometry.matls') === undefined ? [] : map(base.geometry.matls, (matl) => {
      return new Matl(JSON.stringify(matl), this.ramps.ramps);
    });
    this.geometry.holes = get(base, 'geometry.holes') === undefined ? [] : map(base.geometry.holes, (hole) => {
      return new Hole(JSON.stringify(hole));
    });
    // Create geometry surfs after matls initialization
    this.geometry.surfs = get(base, 'geometry.surfs') === undefined ? [new Surf(JSON.stringify({ id: "inert", editable: false }))] : map(base.geometry.surfs, (surf) => {
      return new Surf(JSON.stringify(surf), this.geometry.matls);
    });
    // Create obsts after surfaces and devices initialization
    this.geometry.obsts = get(base, 'geometry.obsts') === undefined ? [] : map(base.geometry.obsts, (obst) => {
      return new Obst(JSON.stringify(obst), this.geometry.surfs, this.output.devcs);
    });
    this.geometry.geoms = get(base, 'geometry.geoms') === undefined ? [] : map(base.geometry.geoms, (geom) => {
      return new Geom(JSON.stringify(geom), this.geometry.surfs);
    });

    // Create ventilation elements
    this.ventilation.surfs = get(base, 'ventilation.surfs') === undefined ? [] : map(base.ventilation.surfs, (surf) => {
      return new SurfVent(JSON.stringify(surf), this.ramps.ramps);
    });
    this.ventilation.jetfans = get(base, 'ventilation.jetfans') === undefined ? [] : map(base.ventilation.jetfans, (jetfan) => {
      return new JetFan(JSON.stringify(jetfan), this.ramps.ramps);
    });
    this.ventilation.vents = get(base, 'ventilation.vents') === undefined ? [] : map(base.ventilation.vents, (vent) => {
      return new Vent(JSON.stringify(vent), this.ventilation.surfs);
    });

    // Create fire elements
    this.fires.fires = get(base, 'fires.fires') === undefined ? [] : map(base.fires.fires, (fire) => {
      return new Fire(JSON.stringify(fire), this.ramps.ramps);
    });
    this.fires.combustion = get(base, 'fires.combustion') === undefined ? new Combustion(JSON.stringify({})) : new Combustion(JSON.stringify(base.fires.combustion));
    this.fires.fuels = get(base, 'fires.fuels') === undefined ? [new Fuel(JSON.stringify({}))] : map(base.fires.fuels, (fuel) => {
      return new Fuel(JSON.stringify(fuel), this.specie.specs);
    });

    // Create output elements

    this.output.general = get(base, 'output.general') === undefined ? new Dump("{}") : new Dump(JSON.stringify(base.output.general));

    this.output.bndfs = get(base, 'output.bndfs') === undefined ? [] : map(base.output.bndfs, (bndf) => {
      return new Bndf(JSON.stringify(bndf), this.specie.specs, this.particle.parts);
    });

    this.output.slcfs = get(base, 'output.slcfs') === undefined ? [] : map(base.output.slcfs, (slcf) => {
      return new Slcf(JSON.stringify(slcf), this.specie.specs, this.particle.parts);
    });

    this.output.isofs = get(base, 'output.isofs') === undefined ? [] : map(base.output.isofs, (isof) => {
      return new Isof(JSON.stringify(isof), this.specie.specs, this.particle.parts);
    });

    this.output.props = get(base, 'output.props') === undefined ? [] : map(base.output.props, (prop) => {
      return new Prop(JSON.stringify(prop), this.ramps.ramps, this.particle.parts);
    });

    this.output.ctrls = get(base, 'output.ctrls') === undefined ? [] : map(base.output.ctrls, (ctrl) => {
      return new Ctrl(JSON.stringify(ctrl));
    });
  }

  // TODO Removers - to save remove dependent objects !!!

  /** Prepare FDS object to export to DB */
  // TODO finish
  public toJSON(): object {
    let fds = {
      general: this.general.toJSON(),
      geometry: {
        meshes: map(this.geometry.meshes, (mesh: Mesh) => { return mesh.toJSON(); }),
        opens: map(this.geometry.opens, (open: Open) => { return open.toJSON(); }),
        matls: map(this.geometry.matls, (matl: Matl) => { return matl.toJSON(); }),
        surfs: map(this.geometry.surfs, (surf: Surf) => { return surf.toJSON(); }),
        obsts: map(this.geometry.obsts, (obst: Obst) => { return obst.toJSON(); }),
        holes: map(this.geometry.holes, (hole: Hole) => { return hole.toJSON(); }),
        geoms: map(this.geometry.geoms, (geom: Geom) => { return geom.toJSON(); }),
      },
      ventilation: {
        surfs: map(this.ventilation.surfs, (surf: SurfVent) => { return surf.toJSON(); }),
        vents: map(this.ventilation.vents, (vent: Vent) => { return vent.toJSON(); }),
        jetfans: map(this.ventilation.jetfans, (jetfan: JetFan) => { return jetfan.toJSON(); }),
      },
      fires: {
        fires: map(this.fires.fires, (fire: Fire) => { return fire.toJSON(); }),
        combustion: this.fires.combustion.toJSON(),
        fuels: map(this.fires.fuels, (fuel: Fuel) => { return fuel.toJSON(); })
      },
      output: {
        general: this.output.general.toJSON(),
        bndfs: map(this.output.bndfs, (bndf: Bndf) => { return bndf.toJSON(); }),
        slcfs: map(this.output.slcfs, (slcf: Slcf) => { return slcf.toJSON(); }),
        isofs: map(this.output.isofs, (isof: Isof) => { return isof.toJSON(); }),
        devcs: map(this.output.devcs, (devc: Devc) => { return devc.toJSON(); }),
        props: map(this.output.props, (prop: Prop) => { return prop.toJSON(); }),
        ctrls: map(this.output.ctrls, (ctrl: Ctrl) => { return ctrl.toJSON(); })
      },
      specie: {
        specs: map(this.specie.specs, (spec: Spec) => {return spec.toJSON(); }),
        surfs: map(this.specie.surfs, (surfspec: SurfSpec) => {return surfspec.toJSON(); }),
        vents: map(this.specie.vents, (ventspec: VentSpec) => {return ventspec.toJSON(); })
      },
      ramps: this.ramps
    }

    return fds;
  }


}
