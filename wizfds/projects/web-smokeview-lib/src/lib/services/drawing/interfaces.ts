
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
	vis: IVis
}