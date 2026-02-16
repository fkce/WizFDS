
export interface IXb {
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    z1: number,
    z2: number,
}

export interface IVis {
	xbNorm: IXb,
	colorNorm: number[]
}

export interface ILayers {
    materials: {
        //material: Matl,
        fraction: number
    }[],
    thickness: number
}

export interface IColor {
    label: string,
    value: string,
    rgb: number[],
    show: boolean
}

export interface ISurf {
    id: string,
    uuid: string,
    idAC: number,
    editable: boolean,
    color: IColor,
    backing: string,
    adiabatic: boolean,
    transparency: number,
    layers: ILayers[]
}

export interface IHole {
    id: string,
    uuid: string,
    idAC: number,
    xb: IXb,
    devc_id?: string,
    ctrl_id?: string,
    vis: IVis
}

export interface IObst {
	id: string,
	uuid: string,
	idAC: number,
	xb: IXb,
	surf: any,
	elevation: number,
	thicken: boolean,
	overlay: boolean,
	permit_hole: boolean,
	removable: boolean,
	//ctrl: Ctrl,
	//devc: Devc,
	ctrl_id: string,
	devc_id: string,
	holes?: IHole[],  // Array of holes to cut from this obst
	vis: IVis
}

export interface IVent {
    id: string,
    uuid: string,
    idAC: number,
    xb: IXb,
    surf_id: string,
    elevation: number,
    color: IColor,
    vis: IVis
}

export interface IJetFan {
    id: string,
    uuid: string,
    idAC: number,
    xb: IXb,
    surf: any,
    elevation: number,
    direction: string,
    color: IColor,
    transparency: number,
    vis: IVis,
    // Jetfan specific properties
    flow: {
        type: string,
        velocity: number,
        volume_flow: number,
        mass_flow: number
    },
    // Generated vents
    vent_in: IVent,
    vent_out: IVent
}

export interface IMesh {
    id: string,
    uuid: string,
    idAC: number,
    color: IColor,
    isize: number,
    jsize: number,
    ksize: number,
    ijk: number[],
    xb: IXb,
    cells: number,
    mpi_process: string,
    n_threads: string,
	vis: IVis
}

export interface IOpen {
    id: string,
    uuid: string,
    idAC: number,
    color: IColor,
    xb: IXb,
    surf_id: string,
	vis: IVis
}

export interface IFire {
    id: string,
    uuid: string,
    idAC: number,
    xb: IXb,
    color: IColor,
    vis: IVis
}