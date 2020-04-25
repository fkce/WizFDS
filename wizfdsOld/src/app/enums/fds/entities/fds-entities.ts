'use strict';

export const FdsEntities =
    {
        bndf: {
          cell_centered: {
            type: 'Logical',
            default: [
              false
            ],
            help: 'Boundary file data are computed at the center of each surface cell, but they are linearly interpolated to cell corners and output to a file that is read by Smokeview. To prevent this from happening, set CELL_CENTERED=.TRUE.',
            pattern: '',
            valid_ranges: [
              {
                minInclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          part_id: {
            type: 'Character',
            default: [],
            help: 'Specify appropriate particle type related to an output quantity: ',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          prop_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          quantity: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          statistics: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        clip: {
          maximum_density: {
            type: 'Real',
            units: 'kg/m^3',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          maximum_temperature: {
            type: 'Real',
            units: 'Cdeg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          minimum_density: {
            type: 'Real',
            units: 'kg/m^3',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          minimum_temperature: {
            type: 'Real',
            units: 'Cdeg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        csvf: {
          uvwfile: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        ctrl: {
          constant: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          delay: {
            type: 'Real',
            units: 's',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          differential_gain: {
            type: 'Real',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evacuation: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          function_type: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          initial_state: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          input_id: {
            type: 'Char.Array',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          integral_gain: {
            type: 'Real',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          latch: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n: {
            type: 'Integer',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          on_bound: {
            type: 'Character',
            default: [
              'ctLOWER'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          proportional_gain: {
            type: 'Real',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          setpoint: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          target_value: {
            type: 'Real',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          trip_direction: {
            type: 'Integer',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        devc: {
          bypass_flowrate: {
            type: 'Real',
            units: 'kg/s',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          conversion_factor: {
            type: 'Real',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          coord_factor: {
            type: 'Real',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ctrl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          delay: {
            type: 'Real',
            units: 's',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          depth: {
            type: 'Real',
            units: 'm',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          devc_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dry: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          duct_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evacuation: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          flowrate: {
            type: 'Real',
            units: 'kg/s',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          hide_coordinates: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          initial_state: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          init_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ior: {
            type: 'Integer',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          latch: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          matl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          node_id: {
            type: 'Character(2)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          no_update_devc_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          no_update_ctrl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          orientation: {
            type: 'RealTriplet',
            default: [
              0,0,-1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          orientation_number: {
            type: 'Integer',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          output: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          part_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pipe_index: {
            type: 'Integer',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          points: {
            type: 'Integer',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          prop_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          quantity: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          quantity2: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          quantity_range: {
            type: 'RealPair',
            default: [
              '-1e50,1e50'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          relative: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          rotation: {
            type: 'Real',
            units: 'deg.',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          setpoint: {
            type: 'Real',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          statistics: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          statistics_start: {
            type: 'Real',
            units: 's',
            default: [
              'ctT'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          smoothing_factor: {
            type: 'Real',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          surf_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          time_averaged: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          time_history: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          trip_direction: {
            type: 'Integer',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          units: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          velo_index: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xb: {
            type: 'RealSextuplet',
            default: [
              0,1,0,1,0,1
            ],
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xyz: {
            type: 'RealTriplet',
            default: [
              0,0,0
            ],
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          x_id: {
            type: 'Character',
            default: [
              'ctID-x'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          y_id: {
            type: 'Character',
            default: [
              'ctID-y'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          z_id: {
            type: 'Character',
            default: [
              'ctID-z'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        dump: {
          clip_restart_files: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          column_dump_limit: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ctrl_column_limit: {
            type: 'Integer',
            default: [
              254
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          devc_column_limit: {
            type: 'Integer',
            default: [
              254
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_bndf: {
            type: 'Real',
            units: 's',
            default: [
              '2,Deltatct/NFRAMES'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_ctrl: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/NFRAMES'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_devc: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/NFRAMES'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_devc_line: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/2'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_flush: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/NFRAMES'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_hrr: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/NFRAMES'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_isof: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/NFRAMES'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_mass: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/NFRAMES'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_part: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/NFRAMES'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_pl3d: {
            type: 'Real',
            units: 's',
            default: [
              1.E10
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_prof: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/NFRAMES'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_restart: {
            type: 'Real',
            units: 's',
            default: [
              100.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_sl3d: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/5'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_slcf: {
            type: 'Real',
            units: 's',
            default: [
              'Deltatct/NFRAMES'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          eb_part_file: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          flush_file_buffers: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_file: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          maximum_particles: {
            type: 'Integer',
            default: [
              1000000
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          nframes: {
            type: 'Integer',
            default: [
              120
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          plot3d_part_id: {
            type: 'Char.Quint',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          plot3d_quantity: {
            type: 'Char.Quint',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          plot3d_spec_id: {
            type: 'Char.Quint',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          plot3d_velo_index: {
            type: 'Int.Quint',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          render_file: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          sig_figs: {
            type: 'Integer',
            default: [
              8
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          sig_figs_exp: {
            type: 'Integer',
            default: [
              3
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          smoke3d: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          smoke3d_quantity: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          smoke3d_spec_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          status_files: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          suppress_diagnostics: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          uvw_timer: {
            type: 'RealVector',
            units: 's',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          velocity_error_file: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          write_xyz: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        geom: {
          faces: {
            type: 'Array',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          ijk: {
            type: 'IntegerTriplet',
            default: [ 10,10,10 ],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          matl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          move_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          n_lat: {
            type: 'Integer',
            default: [ 0 ],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          n_levels: {
            type: 'Integer',
            default: [ 0 ],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          n_long: {
            type: 'Integer',
            default: [ 0 ],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          sphere_origin: {
            type: 'RealTriplet',
            units: 'm',
            default: [ 0,0,0 ],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          sphere_radius: {
            type: 'Real',
            default: [1],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          sphere_type: {
            type: 'Integer',
            default: [ 0 ],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          surf_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
          },
          texture_mapping: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
          },
          texture_origin: {
            type: 'RealTriplet',
            units: 'm',
            default: [ 0,0,0 ],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          texture_scale: {
            type: 'Real',
            default: [1],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          verts: {
            type: 'Array',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          volus: {
            type: 'Array',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          xb: {
            type: 'RealSextuplet',
            default: [ 0,1,0,1,0,1 ],
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          zvals: {
            type: 'Real',
            default: [1],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          }
        },
        head: {
          chid: {
            type: 'Character',
            default: [
              'Chid_out'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          title: {
            type: 'Character',
            default: [
              'Simulation title'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        hole: {
          color: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ctrl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          devc_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evacuation: {
            type: 'Logical',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mesh_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mult_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          rgb: {
            type: 'IntegerTriplet',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          transparency: {
            type: 'Real',
            default: [1],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xb: {
            type: 'RealSextuplet',
            default: [
              0,1,0,1,0,1
            ],
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        hvac: {
          aircoil_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ambient: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          area: {
            type: 'Real',
            units: 'm^2',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          clean_loss: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          coolant_mass_flow: {
            type: 'Real',
            units: 'kg/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          coolant_specific_heat: {
            type: 'Real',
            units: 'sikJ/(kg.K)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          coolant_temperature: {
            type: 'Real',
            units: 'Cdeg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ctrl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          damper: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          devc_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          diameter: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          duct_id: {
            type: 'CharacterArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          efficiency: {
            type: 'RealArray',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          fan_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          filter_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          fixed_q: {
            type: 'Real',
            units: 'kW',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          leak_enthalpy: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          length: {
            type: 'Real',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          loading: {
            type: 'RealArray',
            units: 'kg',
            default: [
              0.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          loading_multiplier: {
            type: 'RealArray',
            units: '1/kg',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          loss: {
            type: 'RealArray',
            default: [
              0.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_flow: {
            type: 'Real',
            units: 'kg/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          max_flow: {
            type: 'Real',
            units: 'm^3/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          max_pressure: {
            type: 'Real',
            units: 'Pa',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          node_id: {
            type: 'CharacterDoublet',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          perimeter: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          reverse: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          roughness: {
            type: 'Real',
            units: 'm',
            default: [
              0.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'CharacterArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tau_ac: {
            type: 'Real',
            units: 's',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tau_fan: {
            type: 'Real',
            units: 's',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tau_vf: {
            type: 'Real',
            units: 's',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          type_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vent_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vent2_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          volume_flow: {
            type: 'Real',
            default: 0,
            units: 'm^3/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xyz: {
            type: 'RealTriplet',
            units: 'm',
            default: [
              0,0,0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        init: {
          cell_centered: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ctrl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          density: {
            type: 'Real',
            units: 'kg/m^3',
            default: [
              'Ambient'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          devc_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          diameter: {
            type: 'Real',
            units: 'mum',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_insert: {
            type: 'Real',
            units: 's',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dx: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dy: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dz: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          height: {
            type: 'Real',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          hrrpuv: {
            type: 'Real',
            units: 'kW/m^3',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_fraction: {
            type: 'RealArray',
            units: 'kg/kg',
            default: [
              'Ambient'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_per_time: {
            type: 'Real',
            units: 'kg/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_per_volume: {
            type: 'Real',
            units: 'kg/m^3',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mult_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_particles: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_particles_per_cell: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          part_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          particle_weight_factor: {
            type: 'Real',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          radius: {
            type: 'Real',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          shape: {
            type: 'Character',
            default: [
              'BLOCK'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'CharacterArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          temperature: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              'ctTMPA'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          uvw: {
            type: 'RealTriplet',
            units: 'm/s',
            default: [
              0,0,0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xb: {
            type: 'RealSextuplet',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xyz: {
            type: 'RealTriplet',
            default: [
              0,0,0
            ],
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        isof: {
          quantity: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          reduce_triangles: {
            type: 'Integer',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          value: {
            type: 'RealArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          velo_index: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        matl: {
          a: {
            type: 'Realarray',
            units: '1/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          absorption_coefficient: {
            type: 'Real',
            units: '1/m',
            default: [
              40000.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          allow_shrinking: {
            type: 'Logical',
            default: [
              'cttrue'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          allow_swelling: {
            type: 'Logical',
            default: [
              'cttrue'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          boiling_temperature: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              5000.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          conductivity: {
            type: 'Real',
            units: 'siW/(m.K)',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          conductivity_ramp: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          density: {
            type: 'Real',
            units: 'kg/m^3',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          e: {
            type: 'Realarray',
            units: 'kJ/kmol',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          emissivity: {
            type: 'Real',
            default: [
              0.9
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          gas_diffusion_depth: {
            type: 'Realarray',
            units: 'm',
            default: [
              0.001
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          heating_rate: {
            type: 'Realarray',
            units: 'Cdeg/min',
            default: [
              5.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          heat_of_combustion: {
            type: 'Realarray',
            units: 'kJ/kg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          heat_of_reaction: {
            type: 'Realarray',
            units: 'kJ/kg',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          matl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          nu_matl: {
            type: 'Realarray',
            units: 'kg/kg',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          nu_spec: {
            type: 'Realarray',
            units: 'kg/kg',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_reactions: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_o2: {
            type: 'Realarray',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_s: {
            type: 'Realarray',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_t: {
            type: 'Realarray',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pcr: {
            type: 'Logicalarray',
            default: [
              'ctfalse'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pyrolysis_range: {
            type: 'Realarray',
            units: 'Cdeg',
            default: [
              80.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          reference_rate: {
            type: 'Realarray',
            units: '1/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          reference_temperature: {
            type: 'Realarray',
            units: 'Cdeg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          specific_heat: {
            type: 'Real',
            units: 'sikJ/(kg.K)',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          specific_heat_ramp: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          threshold_sign: {
            type: 'Realarray',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          threshold_temperature: {
            type: 'Realarray',
            units: 'Cdeg',
            default: [
              -273.15
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        mesh: {
          color: {
            type: 'Character',
            default: [
              'YELLOW'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          cylindrical: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evacuation: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evac_humans: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evac_z_offset: {
            type: 'Real',
            units: 'm',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: 'Help for MESH ID attribute',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ijk: {
            type: 'IntegerTriplet',
            default: [
              10,10,10
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          level: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mpi_process: {
            type: 'Integer',
            default: [
              ''
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_threads: {
            type: 'Integer',
            default: [
              ''
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mult_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          rgb: {
            type: 'IntegerTriplet',
            default: [
              0,0,0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xb: {
            type: 'RealSextuplet',
            units: 'm',
            "default": [
              0,1,0,1,0,1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        misc: {
          allow_surface_particles: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          allow_underside_particles: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          assumed_gas_temperature: {
            type: 'Real',
            units: 'Cdeg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          assumed_gas_temperature_ramp: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          baroclinic: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          bndf_default: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          cnf_cutoff: {
            type: 'Real',
            default: [
              0.005
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          cfl_max: {
            type: 'Real',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          cfl_min: {
            type: 'Real',
            default: [
              0.8
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          cfl_velocity_norm: {
            type: 'Integer',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          check_ht: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          check_vn: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          clip_mass_fraction: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c_deardorff: {
            type: 'Real',
            default: [
              0.1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c_smagorinsky: {
            type: 'Real',
            default: [
              0.20
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c_vreman: {
            type: 'Real',
            default: [
              0.07
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          constant_specific_heat_ratio: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dns: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          drift_flux: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_hvac: {
            type: 'Real',
            units: 's',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_mean_forcing: {
            type: 'Real',
            units: 's',
            default: [
              1.E10
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evacuation_drill: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evacuation_mc_mode: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evac_pressure_iterations: {
            type: 'Integer',
            default: [
              50
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evac_time_iterations: {
            type: 'Integer',
            default: [
              50
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          flux_limiter: {
            type: 'Integer',
            default: [
              2
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          force_vector: {
            type: 'Real',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          gamma: {
            type: 'Real',
            default: [
              1.4
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          gravitational_deposition: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          gravitational_settling: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ground_level: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          gvec: {
            type: 'RealTriplet',
            units: 'm/s^2',
            default: [
              0,0,-9.81
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          h_f_reference_temperature: {
            type: 'Real',
            units: 'sidegreeC',
            default: [
              25.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          humidity: {
            type: 'Real',
            units: '%',
            default: [
              40.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          initial_unmixed_fraction: {
            type: 'Real',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          lapse_rate: {
            type: 'Real',
            units: 'sidegreeC/m',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          max_chemistry_iterations: {
            type: 'Integer',
            default: [
              1000
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          max_leak_paths: {
            type: 'Integer',
            default: [
              200
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          maximum_visibility: {
            type: 'Real',
            units: 'm',
            default: [
              30
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mean_forcing: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mpi_timeout: {
            type: 'Real',
            units: 's',
            default: [
              10.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          noise: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          noise_velocity: {
            type: 'Real',
            units: 'm/s',
            default: [
              0.005
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          no_evacuation: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          overwrite: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          particle_cfl: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          particle_cfl_max: {
            type: 'Real',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          porous_floor: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pr: {
            type: 'Real',
            default: [
              0.5
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          projection: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          p_inf: {
            type: 'Real',
            units: 'Pa',
            default: [
              101325
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_gx: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_gy: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_gz: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          restart: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          restart_chid: {
            type: 'Character',
            default: [
              'ctCHID'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          richardson_error_tolerance: {
            type: 'Real',
            default: [
              '1.0E-3'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          run_avg_fac: {
            type: 'Real',
            default: [
              0.5
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          sc: {
            type: 'Real',
            default: [
              0.5
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          second_order_interpolated_boundary: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          shared_file_system: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          smoke_albedo: {
            type: 'Real',
            default: [
              0.3
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          solid_phase_only: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          stratification: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          suppression: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          texture_origin: {
            type: 'RealTriplet',
            units: 'm',
            default: [
              0,0,0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          thermophoretic_deposition: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          thicken_obstructions: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tmpa: {
            type: 'Real',
            units: 'sidegreeC',
            default: [
              20.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          turbulence_model: {
            type: 'Character',
            default: [
              'DEARDORFF'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          turbulent_deposition: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          u0: {
            type: 'Reals',
            units: 'm/s',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          visibility_factor: {
            type: 'Real',
            default: [
              3
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vn_max: {
            type: 'Real',
            default: [
              0.5
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vn_min: {
            type: 'Real',
            default: [
              0.4
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          y_co2_infty: {
            type: 'Real',
            units: 'kg/kg',
            default: [
              0.000595
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          y_o2_infty: {
            type: 'Real',
            units: 'kg/kg',
            default: [
              0.232378
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        mult: {
          dx: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dxb: {
            type: 'RealSextuplet',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dx0: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dy: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dy0: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dz: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dz0: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          i_lower: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          i_upper: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          j_lower: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          j_upper: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          k_lower: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          k_upper: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_lower: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_upper: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        obst: {
          allow_vent: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          bndf_face: {
            type: 'LogicalArray',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          bndf_obst: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          bulk_density: {
            type: 'Real',
            units: 'kg/m^3',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          color: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ctrl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          devc_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evacuation: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mesh_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mult_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          outline: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          overlay: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          permit_hole: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          prop_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          removable: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          rgb: {
            type: 'IntegerTriplet',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          surf_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          surf_id6: {
            type: 'CharacterSextuplet',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          surf_ids: {
            type: 'CharacterTriplet',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          texture_origin: {
            type: 'RealTriplet',
            units: 'm',
            default: [
              0,0,0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          thicken: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          transparency: {
            type: 'Real',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xb: {
            type: 'RealSextuplet',
            default: [
              0,1,0,1,0,1
            ],
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        part: {
          age: {
            type: 'Real',
            units: 's',
            default: [
              '1times10^5'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          breakup: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          breakup_cnf_ramp_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          breakup_distribution: {
            type: 'Character',
            default: [
              'ROSIN...'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          breakup_gamma_d: {
            type: 'Real',
            default: [
              2.4
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          breakup_ratio: {
            type: 'Real',
            default: [
              '3/7'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          breakup_sigma_d: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          check_distribution: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          cnf_ramp_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          color: {
            type: 'Character',
            default: [
              'BLACK'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          complex_refractive_index: {
            type: 'Real',
            default: [
              0.01
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ctrl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dense_volume_fraction: {
            type: 'Real',
            units: 'm^3/m^3',
            default: [
              '1times10^-5'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          devc_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          diameter: {
            type: 'Real',
            default: 0,
            units: 'mum',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          distribution: {
            type: 'Character',
            default: [
              'ROSIN...'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          drag_coefficient: {
            type: 'RealArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          drag_law: {
            type: 'Character',
            default: [
              'SPHERE'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          free_area_fraction: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          gamma_d: {
            type: 'Real',
            default: [
              2.4
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          heat_of_combustion: {
            type: 'Real',
            units: 'kJ/kg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          horizontal_velocity: {
            type: 'Real',
            units: 'm/s',
            default: [
              0.2
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          initial_temperature: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              'ctTMPA'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          massless: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          maximum_diameter: {
            type: 'Real',
            units: 'mum',
            default: [
              'Infinite'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          minimum_diameter: {
            type: 'Real',
            units: 'mum',
            default: [
              20.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          monodisperse: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_strata: {
            type: 'Integer',
            default: [
              7
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          orientation: {
            type: 'RealArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          permeability: {
            type: 'RealArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          prop_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          quantities: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          quantities_spec_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          radiative_property_table: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          real_refractive_index: {
            type: 'Real',
            default: [
              1.33
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          rgb: {
            type: 'Integers',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          sampling_factor: {
            type: 'Integer',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          sigma_d: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          static: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          surface_tension: {
            type: 'Real',
            units: 'N/m',
            default: [
              '7.28times10^4'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          surf_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          turbulent_dispersion: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vertical_velocity: {
            type: 'Real',
            units: 'm/s',
            default: [
              0.5
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        pres: {
          check_poisson: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          fishpak_bc: {
            type: 'Integer',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          max_pressure_iterations: {
            type: 'Integer',
            default: [
              10
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pressure_relax_time: {
            type: 'Real',
            units: 's',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          relaxation_factor: {
            type: 'Real',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          velocity_tolerance: {
            type: 'Real',
            units: 'm/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        prof: {
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          format_index: {
            type: 'Integer',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ior: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          quantity: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xyz: {
            type: 'RealTriplet',
            default: [
              0,0,0
            ],
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        prop: {
          activation_obscuration: {
            type: 'Real',
            units: '%/m',
            default: [
              3.24
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          activation_temperature: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              74.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          alpha_c: {
            type: 'Real',
            default: [
              1.8
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          alpha_e: {
            type: 'Real',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          bead_density: {
            type: 'Real',
            units: 'kg/m^3',
            default: [
              8908.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          bead_diameter: {
            type: 'Real',
            units: 'm',
            default: [
              0.001
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          bead_emissivity: {
            type: 'Real',
            default: [
              0.85
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          bead_heat_transfer_coefficient: {
            type: 'Real',
            units: 'siW/(m^2.K)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          bead_specific_heat: {
            type: 'Real',
            units: 'sikJ/(kg.K)',
            default: [
              0.44
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          beta_c: {
            type: 'Real',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          beta_e: {
            type: 'Real',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          characteristic_velocity: {
            type: 'Real',
            units: 'm/s',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c_factor: {
            type: 'Real',
            units: '(m/s)^1/2',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          flow_ramp: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          flow_rate: {
            type: 'Real',
            units: 'L/min',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          flow_tau: {
            type: 'Real',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          gauge_emissivity: {
            type: 'Real',
            default: [
              0.9
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          gauge_temperature: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              'ctTMPA'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          initial_temperature: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              'ctTMPA'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          k_factor: {
            type: 'Real',
            units: 'siL/(min.bar^ha)',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          path_length: {
            type: 'Real',
            units: 'm',
            default: [
              1.8
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_flow_rate: {
            type: 'Real',
            units: 'kg/s',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          offset: {
            type: 'Real',
            units: 'm',
            default: [
              0.05
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          operating_pressure: {
            type: 'Real',
            units: 'bar',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          orifice_diameter: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          p0: {
            type: 'Real',
            units: 'm/s',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          particles_per_second: {
            type: 'Integer',
            default: [
              5000
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          particle_velocity: {
            type: 'Real',
            units: 'm/s',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          part_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_end: {
            type: 'Real',
            units: 's',
            default: [
              'ctT_END'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_histogram: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_histogram_cumulative: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_histogram_limits: {
            type: 'RealArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_histogram_nbins: {
            type: 'Integer',
            default: [
              10
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_integrate: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_m: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_n: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_normalize: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_radius: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pdpa_start: {
            type: 'Real',
            units: 's',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pressure_ramp: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          quantity: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          rti: {
            type: 'Real',
            units: 'sqrtsim.s',
            default: [
              100.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          smokeview_id: {
            type: 'Char.Array',
            default: 'sensor',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          smokeview_parameters: {
            type: 'Char.Array',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spray_angle: {
            type: 'RealPair',
            units: 'deg.',
            default: [
              60.,75.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spray_pattern_beta: {
            type: 'Integer',
            units: 'deg.',
            default: [
              5
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spray_pattern_mu: {
            type: 'Integer',
            units: 'deg.',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spray_pattern_shape: {
            type: 'Character',
            default: [
              'gaussian'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spray_pattern_table: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          velocity_component: {
            type: 'Integer',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        radi: {
          angle_increment: {
            type: 'Integer',
            default: [
              5
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          band_limits: {
            type: 'RealArray',
            units: 'mum',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          kappa0: {
            type: 'Real',
            units: '1/m',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mie_minimum_diameter: {
            type: 'Real',
            units: 'mum',
            default: [
              0.5
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mie_maximum_diameter: {
            type: 'Real',
            units: 'mum',
            default: [
              '1.5timesD'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mie_ndg: {
            type: 'Integer',
            default: [
              50
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          nmieang: {
            type: 'Integer',
            default: [
              15
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          number_initial_iterations: {
            type: 'Integer',
            default: [
              10
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          number_radiation_angles: {
            type: 'Integer',
            default: [
              100
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          path_length: {
            type: 'Real',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          radiation: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          radtmp: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              900
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          time_step_increment: {
            type: 'Integer',
            default: [
              3
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          wide_band_model: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        ramp: {
          ctrl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          devc_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          f: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          number_interpolation_points: {
            type: 'Integer',
            default: [
              5000
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          t: {
            type: 'Real',
            units: 's or deg C',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          x: {
            type: 'Real',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        reac: {
          a: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          auto_ignition_temperature: {
            type: 'Real',
            units: 'Cdeg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c: {
            type: 'Real',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          check_atom_balance: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          co_yield: {
            type: 'Real',
            units: 'kg/kg',
            default: [
              0.01
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          critical_flame_temperature: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              1327
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          e: {
            type: 'Real',
            units: 'kJ/kmol',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          epumo2: {
            type: 'Real',
            units: 'kJ/kg',
            default: [
              13100
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          equation: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          formula: {
            type: 'Character',
            default: [''],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          fuel: {
            type: 'Character',
            default: [''],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          fuel_radcal_id: {
            type: 'Character',
            default: [
              'methane'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          h: {
            type: 'Real',
            default: [ 1.75 ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          heat_of_combustion: {
            type: 'Real',
            default: [
              26200
            ],
            units: 'kJ/kg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [
              'FOAM'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ideal: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n: {
            type: 'Real',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          nu: {
            type: 'RealArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_s: {
            type: 'RealArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_t: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          o: {
            type: 'Real',
            default: [
              0.25
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          radiative_fraction: {
            type: 'Real',
            default: [
              0.34
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          reac_atom_error: {
            type: 'Real',
            units: 'atoms',
            default: [
              '1.E-5'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          reac_mass_error: {
            type: 'Real',
            units: 'kg/kg',
            default: [
              '1.E-4'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          soot_h_fraction: {
            type: 'Real',
            default: [
              0.1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          soot_yield: {
            type: 'Real',
            units: 'kg/kg',
            default: [
              0.11
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id_n_s: {
            type: 'Char.Array',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id_nu: {
            type: 'Char.Array',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          third_body: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        slcf: {
          cell_centered: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evacuation: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          maximum_value: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mesh_number: {
            type: 'Integer',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          minimum_value: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          part_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pbx: {
            type: 'Real',
            default: 0,
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pby: {
            type: 'Real',
            default: 0,
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pbz: {
            type: 'Real',
            default: 0,
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          quantity: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          quantity2: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vector: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          velo_index: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xb: {
            type: 'RealSextuplet',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        spec: {
          aerosol: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          alias: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          background: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          conductivity: {
            type: 'Real',
            units: 'siW/(m.K)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          conductivity_solid: {
            type: 'Real',
            units: 'siW/(m.K)',
            default: [
              0.26
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          density_liquid: {
            type: 'Real',
            units: 'kg/m^3',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          density_solid: {
            type: 'Real',
            units: 'kg/m^3',
            default: [
              1800.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          diffusivity: {
            type: 'Real',
            units: 'm^2/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          enthalpy_of_formation: {
            type: 'Real',
            units: 'kJ/mol',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          epsilonklj: {
            type: 'Real',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          fic_concentration: {
            type: 'Real',
            units: 'ppm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          fld_lethal_dose: {
            type: 'Real',
            units: 'ppmtimesmin',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          formula: {
            type: 'Character',
            default: [
              ''
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          heat_of_vaporization: {
            type: 'Real',
            units: 'kJ/kg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          h_v_reference_temperature: {
            type: 'Real',
            units: 'Cdeg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          lumped_component_only: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_extinction_coefficient: {
            type: 'Real',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_fraction: {
            type: 'RealArray',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_fraction_0: {
            type: 'Real',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mean_diameter: {
            type: 'Real',
            units: 'm',
            default: [
              '1.E-6'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          melting_temperature: {
            type: 'Real',
            units: 'Cdeg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mw: {
            type: 'Real',
            units: 'g/mol',
            default: [
              29.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pr_gas: {
            type: 'Real',
            default: [
              'ctPR'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          primitive: {
            type: 'Logical',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          radcal_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_cp: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_cp_l: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_d: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_g_f: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_k: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_mu: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          reference_enthalpy: {
            type: 'Real',
            units: 'kJ/kg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          reference_temperature: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              25.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          sigmalj: {
            type: 'Real',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'CharacterArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          specific_heat: {
            type: 'Real',
            units: 'sikJ/(kg.K)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          specific_heat_liquid: {
            type: 'Real',
            units: 'sikJ/(kg.K)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vaporization_temperature: {
            type: 'Real',
            units: 'Cdeg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          viscosity: {
            type: 'Real',
            units: 'sikg/(m.s)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          volume_fraction: {
            type: 'RealArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        surf: {
          adiabatic: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          backing: {
            type: 'Character',
            default: [
              'EXPOSED'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          burn_away: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          cell_size_factor: {
            type: 'Real',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c_forced_constant: {
            type: 'Real',
            default: [
              0.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c_forced_pr_exp: {
            type: 'Real',
            default: [
              0.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c_forced_re: {
            type: 'Real',
            default: [
              0.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c_forced_re_exp: {
            type: 'Real',
            default: [
              0.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c_horizontal: {
            type: 'Real',
            default: [
              1.52
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          c_vertical: {
            type: 'Real',
            default: [
              1.31
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          color: {
            type: 'Character',
            default: [
              'RED'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          convection_length_scale: {
            type: 'Real',
            units: 'm',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          convective_heat_flux: {
            type: 'Real',
            units: 'sikW/m^2',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          convert_volume_to_mass: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          default: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dt_insert: {
            type: 'Real',
            units: 's',
            default: [
              0.01
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          emissivity: {
            type: 'Real',
            default: [
              0.9
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          emissivity_back: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evac_default: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          external_flux: {
            type: 'Real',
            units: 'sikW/m^2',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          e_coefficient: {
            type: 'Real',
            units: 'sim^2/(kg.s)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          free_slip: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          geometry: {
            type: 'Character',
            default: [
              'CARTESIAN'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          heat_of_vaporization: {
            type: 'Real',
            units: 'kJ/kg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          heat_transfer_coefficient: {
            type: 'Real',
            units: 'siW/(m^2.K)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          heat_transfer_model: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          hrrpua: {
            type: 'Real',
            units: 'sikW/m^2',
            default: [
              100.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ignition_temperature: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              5000.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          inner_radius: {
            type: 'Real',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          internal_heat_source: {
            type: 'RealArray',
            units: 'kW/m^3',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          layer_divide: {
            type: 'Real',
            default: [
              'ctN_LAYERS/2'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          leak_path: {
            type: 'Int.Pair',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          length: {
            type: 'Real',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_flux: {
            type: 'Real',
            default: 0,
            units: 'kg/(m^2s)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_flux_total: {
            type: 'Real',
            default: 0,
            units: 'kg/(m^2s)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_flux_var: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_fraction: {
            type: 'Real',
            default: 0,
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mass_transfer_coefficient: {
            type: 'Real',
            units: 'm/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          matl_id: {
            type: 'Char.Array',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          matl_mass_fraction: {
            type: 'RealArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          minimum_layer_thickness: {
            type: 'Real',
            units: 'm',
            default: [
              '1.E-6'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mlrpua: {
            type: 'Real',
            units: 'sikg/(m^2.s)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_layer_cells_max: {
            type: 'IntegerArray',
            default: [
              1000
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          net_heat_flux: {
            type: 'Real',
            units: 'kW/m^2',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          no_slip: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          nppc: {
            type: 'Integer',
            default: [
              1
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          particle_mass_flux: {
            type: 'Real',
            units: 'sikg/(m^2.s)',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          part_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ple: {
            type: 'Real',
            default: [
              0.3
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          profile: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          radius: {
            type: 'Real',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_ef: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_mf: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_part: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_q: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_t: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_t_i: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_v: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_v_x: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_v_y: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ramp_v_z: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          rgb: {
            type: 'Int.Triplet',
            default: [
              255,204,102
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          roughness: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spec_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spread_rate: {
            type: 'Real',
            units: 'm/s',
            default: [
              0.05
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          stretch_factor: {
            type: 'Real',
            default: [
              2.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tau_ef: {
            type: 'Real',
            units: 's',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tau_mf: {
            type: 'Real',
            units: 's',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tau_part: {
            type: 'Real',
            units: 's',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tau_q: {
            type: 'Real',
            units: 's',
            default: [ -100. ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tau_t: {
            type: 'Real',
            units: 's',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tau_v: {
            type: 'Real',
            units: 's',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          texture_height: {
            type: 'Real',
            units: 'm',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          texture_map: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          texture_width: {
            type: 'Real',
            units: 'm',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tga_analysis: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tga_final_temperature: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              800.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tga_heating_rate: {
            type: 'Real',
            units: 'Cdeg/min',
            default: [
              5.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          thickness: {
            type: 'RealArray',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tmp_back: {
            type: 'Real',
            units: 'Cdeg',
            default: [
              20.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tmp_front: {
            type: 'Real',
            units: '^{\\circ}C',
            default: 20.,
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tmp_inner: {
            type: 'RealArray',
            units: 'Cdeg',
            default: [
              20.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          transparency: {
            type: 'Real',
            default: 1.,
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vel: {
            type: 'Real',
            default: 0,
            units: 'm/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vel_bulk: {
            type: 'Real',
            units: 'm/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vel_grad: {
            type: 'Real',
            units: '1/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vel_t: {
            type: 'RealPair',
            default: [ 0,0 ],
            units: 'm/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          volume_flow: {
            type: 'Real',
            default: 0,
            units: 'm^3/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          width: {
            type: 'Real',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xyz: {
            type: 'RealTriplet',
            default: [
              0,0,0
            ],
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          z0: {
            type: 'Real',
            units: 'm',
            default: [
              10.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        tabl: {
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          table_data: {
            type: 'RealArray',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        time: {
          dt: {
            type: 'Real',
            units: 's',
            default: [ undefined ],
            help: '',
            pattern: '',
            valid_ranges: [ { minExclusive: '__', maxExclusive: '__' } ],
            reasonable_ranges: [ { minExclusive: '__', maxExclusive: '__' } ]
          },
          evac_dt_flowfield: {
            type: 'Real',
            units: 's',
            default: [
              0.01
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evac_dt_steady_state: {
            type: 'Real',
            units: 's',
            default: [
              0.05
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          limiting_dt_ratio: {
            type: 'Real',
            default: [
              0.0001
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          lock_time_step: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          restrict_time_step: {
            type: 'Logical',
            default: [
              true
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          t_begin: {
            type: 'Real',
            units: 's',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__',
                minInclusive: 0,
                maxInclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          t_end: {
            type: 'Real',
            units: 's',
            default: [
              1200.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          time_shrink_factor: {
            type: 'Real',
            default: [
              1.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          wall_increment: {
            type: 'Integer',
            default: [
              2
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        trnx: {
          cc: {
            type: 'Real',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ideriv: {
            type: 'Integer',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mesh_number: {
            type: 'Integer',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pc: {
            type: 'Real',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        vent: {
          color: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ctrl_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          devc_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          dynamic_pressure: {
            type: 'Real',
            units: 'Pa',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          evacuation: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          ior: {
            type: 'Integer',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          l_eddy: {
            type: 'Real',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          l_eddy_ij: {
            type: 'RealArray',
            units: 'm',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mb: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mesh_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          mult_id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          n_eddy: {
            type: 'Integer',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          outline: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pbx: {
            type: 'Real',
            default: 0,
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pby: {
            type: 'Real',
            default: 0,
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pbz: {
            type: 'Real',
            default: 0,
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          pressure_ramp: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          radius: {
            type: 'Real',
            default: [
              0.
            ],
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          reynolds_stress: {
            type: 'RealArray',
            units: 'm^2/s^2',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          rgb: {
            type: 'IntegerTriplet',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          spread_rate: {
            type: 'Real',
            units: 'm/s',
            default: [
              0.05
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          surf_id: {
            type: 'Character',
            default: [
              'INERT'
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          texture_origin: {
            type: 'RealTriplet',
            units: 'm',
            default: [
              0,0,0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tmp_exterior: {
            type: 'Real',
            units: 'Cdeg',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          tmp_exterior_ramp: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          transparency: {
            type: 'Real',
            default: [
              1.0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          uvw: {
            type: 'RealTriplet',
            default: [
              0,0,0
            ],
            units: 'm/s',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          vel_rms: {
            type: 'Real',
            units: 'm/s',
            default: [
              0.
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xb: {
            type: 'RealSextuplet',
            default: [
              0,1,0,1,0,0
            ],
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xyz: {
            type: 'RealTriplet',
            default: [
              0,0,0
            ],
            units: 'm',
            help: 'XYZ help',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        },
        zone: {
          id: {
            type: 'Character',
            default: [],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          leak_area: {
            type: 'Real',
            units: 'm^2',
            default: [
              0
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          periodic: {
            type: 'Logical',
            default: [
              false
            ],
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          },
          xb: {
            type: 'RealSextuplet',
            units: 'm',
            help: '',
            pattern: '',
            valid_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ],
            reasonable_ranges: [
              {
                minExclusive: '__',
                maxExclusive: '__'
              }
            ]
          }
        }
}
