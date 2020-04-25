'use strict';

export const quantities =
    [
        {
            id: 'Absorption coefficient',
            quantity: 'ABSORPTION COEFFICIENT',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Actuated sprinklers',
            quantity: 'ACTUATED SPRINKLERS',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Adiabatic surface temperature',
            quantity: 'ADIABATIC SURFACE TEMPERATURE',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Aerosol volume fraction',
            quantity: 'AEROSOL VOLUME FRACTION',
            type: ['d', 'i', 'p', 's'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'AMPUA',
            quantity: 'AMPUA',
            type: ['b', 'd'],
            spec: false,
            part: true,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'AMPUA_Z',
            quantity: 'AMPUA_Z',
            type: ['b', 'd'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Aspiration',
            quantity: 'ASPIRATION',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Background pressure',
            quantity: 'BACKGROUND PRESSURE',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Back wall temperature',
            quantity: 'BACK WALL TEMPERATURE',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Burning rate',
            quantity: 'BURNING RATE',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Chamber obscuration',
            quantity: 'CHAMBER OBSCURATION',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'CHI_R',
            quantity: 'CHI_R',
            type: ['d', 'i', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Conductivity',
            quantity: 'CONDUCTIVITY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Control',
            quantity: 'CONTROL',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Control value',
            quantity: 'CONTROL VALUE',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Convective heat flux',
            quantity: 'CONVECTIVE HEAT FLUX',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'CPUA',
            quantity: 'CPUA',
            type: ['b', 'd'],
            spec: false,
            part: true,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'CPUA_Z',
            quantity: 'CPUA_Z',
            type: ['b', 'd'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Cpu time',
            quantity: 'CPU TIME',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Density',
            quantity: 'DENSITY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Deposition velocity',
            quantity: 'DEPOSITION VELOCITY',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Divergence',
            quantity: 'DIVERGENCE',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Enthalpy',
            quantity: 'ENTHALPY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Extinction coefficient',
            quantity: 'EXTINCTION COEFFICIENT',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'FED',
            quantity: 'FED',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'FIC',
            quantity: 'FIC',
            type: ['d', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Friction velocity',
            quantity: 'FRICTION VELOCITY',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Gauge heat flux',
            quantity: 'GAUGE HEAT FLUX',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Heat flow',
            quantity: 'HEAT FLOW',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Heat flow wall',
            quantity: 'HEAT FLOW WALL',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Net heat flux',
            quantity: 'NET HEAT FLUX',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'HRR',
            quantity: 'HRR',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'HRRPUA',
            quantity: 'HRRPUA',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'HRRPUV',
            quantity: 'HRRPUV',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Incident heat flux',
            quantity: 'INCIDENT HEAT FLUX',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Inside wall temperature',
            quantity: 'INSIDE WALL TEMPERATURE',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Iteration',
            quantity: 'ITERATION',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Layer height',
            quantity: 'LAYER HEIGHT',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Link temperature',
            quantity: 'LINK TEMPERATURE',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Lower temperature',
            quantity: 'LOWER TEMPERATURE',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Mass flow',
            quantity: 'MASS FLOW',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Mass flow wall',
            quantity: 'MASS FLOW WALL',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Mass flux',
            quantity: 'MASS FLUX',
            type: ['b', 'd'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Mass flux x',
            quantity: 'MASS FLUX X',
            type: ['d', 'i', 'p', 's'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Mass flux y',
            quantity: 'MASS FLUX Y',
            type: ['d', 'i', 'p', 's'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Mass flux z',
            quantity: 'MASS FLUX Z',
            type: ['d', 'i', 'p', 's'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Mass fraction',
            quantity: 'MASS FRACTION',
            type: ['d', 'i', 'p', 's'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Mixture fraction',
            quantity: 'MIXTURE FRACTION',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'MPUA',
            quantity: 'MPUA',
            type: ['b', 'd'],
            spec: false,
            part: true,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'MPUA_Z',
            quantity: 'MPUA_Z',
            type: ['b', 'd'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Mpuv',
            quantity: 'MPUV',
            type: ['d', 'p', 's'],
            spec: false,
            part: true,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'MPUV_Z',
            quantity: 'MPUV_Z',
            type: ['d', 'p', 's'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Normal velocity',
            quantity: 'NORMAL VELOCITY',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Number of particles',
            quantity: 'NUMBER OF PARTICLES',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Open nozzles',
            quantity: 'OPEN NOZZLES',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Optical density',
            quantity: 'OPTICAL DENSITY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Path obscuration',
            quantity: 'PATH OBSCURATION',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Pressure',
            quantity: 'PRESSURE',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Pressure coefficient',
            quantity: 'PRESSURE COEFFICIENT',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Pressure zone',
            quantity: 'PRESSURE ZONE',
            type: ['d', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Radiative heat flux',
            quantity: 'RADIATIVE HEAT FLUX',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Radiative heat flux gas',
            quantity: 'RADIATIVE HEAT FLUX GAS',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Radiometer',
            quantity: 'RADIOMETER',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Relative humidity',
            quantity: 'RELATIVE HUMIDITY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Sensible enthalpy',
            quantity: 'SENSIBLE ENTHALPY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Solid conductivity',
            quantity: 'SOLID CONDUCTIVITY',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Solid density',
            quantity: 'SOLID DENSITY',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Solid specific heat',
            quantity: 'SOLID SPECIFIC HEAT',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Specific enthalpy',
            quantity: 'SPECIFIC ENTHALPY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Specific heat',
            quantity: 'SPECIFIC HEAT',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Specific sensible enthalpy',
            quantity: 'SPECIFIC SENSIBLE ENTHALPY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Sprinkler link temperature',
            quantity: 'SPRINKLER LINK TEMPERATURE',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Surface density',
            quantity: 'SURFACE DENSITY',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Surface deposition',
            quantity: 'SURFACE DEPOSITION',
            type: ['b', 'd'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Temperature',
            quantity: 'TEMPERATURE',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Thermocouple',
            quantity: 'THERMOCOUPLE',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Time',
            quantity: 'TIME',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Time step',
            quantity: 'TIME STEP',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Transmission',
            quantity: 'TRANSMISSION',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'U-velocity',
            quantity: 'U-VELOCITY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'V-velocity',
            quantity: 'V-VELOCITY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'W-velocity',
            quantity: 'W-VELOCITY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Upper temperature',
            quantity: 'UPPER TEMPERATURE',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Velocity',
            quantity: 'VELOCITY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Viscosity',
            quantity: 'VISCOSITY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Visibility',
            quantity: 'VISIBILITY',
            type: ['d', 'i', 'p', 's'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Volume flow',
            quantity: 'VOLUME FLOW',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Volume flow wall',
            quantity: 'VOLUME FLOW WALL',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Volume fraction',
            quantity: 'VOLUME FRACTION',
            type: ['d', 'i', 'p', 's'],
            spec: true,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Wall clock time',
            quantity: 'WALL CLOCK TIME',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Wall clock time iterations',
            quantity: 'WALL CLOCK TIME ITERATIONS',
            type: ['d'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Wall temperature',
            quantity: 'WALL TEMPERATURE',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        },
        {
            id: 'Wall thickness',
            quantity: 'WALL THICKNESS',
            type: ['b', 'd'],
            spec: false,
            part: false,
            validator: {
                type: 'Real',
                value: '0',
                error_messages: {
                    pattern: ''
                },
                valid_ranges: [],
                reasonable_ranges: []
            }
        }
    ];