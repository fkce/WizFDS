import { FdsElementType } from './elements.service';

/**
 * The form that shows each kind of element.
 *
 * Two kinds share a form - a &MESH with an `OPEN`, an &OBST with a &HOLE - and
 * the form works out which of its lists holds the selected element, so nothing
 * here has to tell it.
 *
 * Three routes lead here: a click in the CAD drawing (`WebsocketService.fSelect`),
 * the contextual tab of the ribbon, and the properties palette. All three mean
 * the same thing - open what is selected in full - so they read one table.
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

/** Where one kind of element is edited in full, if it has a form at all. */
export function formRouteFor(type: FdsElementType): string | undefined {
  return type ? FORM_ROUTES[type] : undefined;
}
