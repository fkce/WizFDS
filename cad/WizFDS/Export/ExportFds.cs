﻿#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Teigha.DatabaseServices;
using Bricscad.EditorInput;
using Teigha.Geometry;
using Teigha.Runtime;
using BricscadDb;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
using Autodesk.AutoCAD.Interop.Common;
#elif GRX_APP
using acApp = Gssoft.Gscad.ApplicationServices.Application;
using Gssoft.Gscad.ApplicationServices;
using Gssoft.Gscad.DatabaseServices;
using Gssoft.Gscad.EditorInput;
using Gssoft.Gscad.Geometry;
using Gssoft.Gscad.Runtime;
using GrxCAD.Interop;
#endif

using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using WizFDS.Websocket;
using WizFDS.Utils;

namespace WizFDS.Export
{
    public class ExportFds
    {

        private class Xb
        {
            public double x1 { get; set; }
            public double x2 { get; set; }
            public double y1 { get; set; }
            public double y2 { get; set; }
            public double z1 { get; set; }
            public double z2 { get; set; }
        }
        private class Xyz
        {
            public double x { get; set; }
            public double y { get; set; }
            public double z { get; set; }
        }
        private class Flow
        {
            public string type { get; set; }
            public double volume_flow { get; set; }
            public double volume_flow_per_hour { get; set; }
        }

        private class Geometry
        {
            public class Mesh
            {
                public double idAC { get; set; }
                public Xb xb { get; set; }
                public double isize { get; set; }
                public double jsize { get; set; }
                public double ksize { get; set; }
            }
            public class Obst
            {
                public class SurfObst
                {
                    public string type { get; set; }
                    public string surf_id { get; set; }
                    public int[] color { get; set; }
                }
                public double idAC { get; set; }
                public Xb xb { get; set; }
                public SurfObst surf { get; set; }
                public float elevation { get; set; }
            }
            public class Geom
            {
                public class SurfGeom
                {
                    public string type { get; set; }
                    public string surf_id { get; set; }
                    public int[] color { get; set; }
                }
                public double idAC { get; set; }
                public List<double[]> verts { get; set; }
                public List<double[]> faces { get; set; }
                public SurfGeom surf { get; set; }
            }
            public class GeomFromFaces
            {
                public class MeshFace
                {
                    public double idAC { get; set; }
                    public string surf_type { get; set; }
                    public string surf_id { get; set; }
                    public int[] color { get; set; }
                    public List<double[]> faceIndexes { get; set; }
                }
                public List<double[]> verts { get; set; }
                public List<MeshFace> faces { get; set; }
            }
            public class Hole
            {
                public double idAC { get; set; }
                public Xb xb { get; set; }
                public float elevation { get; set; }
            }
            public class Surf
            {
                public string id { get; set; }
                public double idAC { get; set; }
                public int[] color { get; set; }
            }
            public class Open
            {
                public double idAC { get; set; }
                public Xb xb { get; set; }
            }

            public List<Mesh> meshes { get; set; }
            public List<Open> opens { get; set; }
            public List<Hole> holes { get; set; }
            public List<Surf> surfs { get; set; }
            public List<Obst> obsts { get; set; }
            public List<Geom> geoms { get; set; }
            public GeomFromFaces geomFromFaces { get; set; }

            public Geometry()
            {
                this.meshes = new List<Mesh>();
                this.opens = new List<Open>();
                this.holes = new List<Hole>();
                this.surfs = new List<Surf>();
                this.obsts = new List<Obst>();
                this.geoms = new List<Geom>();
            }

            private float GetElevation(string layerName)
            {
                try
                {
                    float elevation = float.Parse(layerName.Substring(layerName.IndexOf("(") + 1, layerName.IndexOf(")") - layerName.IndexOf("(") - 1));
                    return elevation;
                }
                catch
                {
                    return 0;
                }
            }

            public void AddMesh(Entity acEnt)
            {
                Mesh mesh = new Mesh
                {
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    xb = new Xb
                    {
                        x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                        x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                        y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                        y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                        z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                        z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                    },
                    isize = ((Point2d)acApp.GetSystemVariable("snapunit")).X,
                    jsize = ((Point2d)acApp.GetSystemVariable("snapunit")).Y,
                    ksize = ((Point2d)acApp.GetSystemVariable("snapunit")).X
                };
                this.meshes.Add(mesh);
            }
            public void AddObst(Entity acEnt)
            {
                Obst obst = new Obst
                {
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    xb = new Xb
                    {
                        x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                        x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                        y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                        y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                        z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                        z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                    },
                    surf = new Obst.SurfObst
                    {
                        type = "surf_id",
                        surf_id = Layers.GetSurfaceName(acEnt.Layer),
                        color = Layers.GetLayerColor(acEnt.Layer)
                    },
                    elevation = this.GetElevation(acEnt.Layer)
                };
                this.obsts.Add(obst);
            }
            public void AddSurf(LayerTableRecord acLyrTblRec)
            {
                Surf surf = new Surf
                {
                    id = Layers.GetSurfaceName(acLyrTblRec.Name),
                    idAC = Convert.ToInt64(acLyrTblRec.ObjectId.Handle.ToString(), 16),
                    color = new int[] { (int)acLyrTblRec.Color.ColorValue.R, (int)acLyrTblRec.Color.ColorValue.G, (int)acLyrTblRec.Color.ColorValue.B }
                };
                this.surfs.Add(surf);
            }
            public void AddSurf(string layer, Handle acHandle)
            {
                Surf surf = new Surf
                {
                    id = Layers.GetSurfaceName(layer),
                    idAC = Convert.ToInt64(acHandle.ToString(), 16),
                    color = Layers.GetLayerColor(layer)
                };
                this.surfs.Add(surf);
            }
            public bool HasSurf(Geometry geometry, string layer)
            {
                foreach (var surf in geometry.surfs)
                {
                    if (surf.id.Contains(Layers.GetSurfaceName(layer)))
                        return true;
                }
                return false;
            }
            public void AddHole(Entity acEnt)
            {
                Hole hole = new Hole
                {
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    xb = new Xb
                    {
                        x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                        x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                        y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                        y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                        z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                        z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                    },
                    elevation = this.GetElevation(acEnt.Layer)
                };
                this.holes.Add(hole);
            }
            public void AddOpen(Entity acEnt)
            {
                Open open = new Open()
                {
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    xb = new Xb
                    {
                        x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                        x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                        y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                        y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                        z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                        z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),

                    }
                };
                this.opens.Add(open);
            }
            public void AddGeom(SubDMesh acEnt)
            {
                Geom geom = new Geom
                {
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    surf = new Geom.SurfGeom
                    {
                        type = "surf_id",
                        surf_id = Layers.GetSurfaceName(acEnt.Layer),
                        color = new int[] { (int)acEnt.Color.ColorValue.R, (int)acEnt.Color.ColorValue.G, (int)acEnt.Color.ColorValue.B }
                    },
                    verts = new List<double[]>(),
                    faces = new List<double[]>()
                };

                // Add faces and vertices
                int[] faceArr = acEnt.FaceArray.ToArray();
                Point3dCollection vertices = acEnt.Vertices;
                int edges = 0;

                // Generate vertices
                foreach (Point3d vertice in vertices)
                {
                    geom.verts.Add(new double[] { vertice.X, vertice.Y, vertice.Z });
                }

                // Generate faces
                for (int x = 0; x < faceArr.Length; x = x + edges + 1)
                {
                    geom.faces.Add(new double[] { faceArr[x + 1] + 1, faceArr[x + 2] + 1, faceArr[x + 3] + 1 });
                    edges = faceArr[x];
                }

                this.geoms.Add(geom);
            }
            // TODO: Add geom exporting from faces with different layers
            public void AddGeomFromFaces(Face acEnt)
            {
                if (this.geomFromFaces == null)
                {
                    this.geomFromFaces = new GeomFromFaces
                    {
                        verts = new List<double[]>(),
                        faces = new List<GeomFromFaces.MeshFace>()
                    };
                }

                for (short i = 0; i < 3; i++)
                {
                    double[] point = new double[] { acEnt.GetVertexAt(i).X, acEnt.GetVertexAt(i).Y, acEnt.GetVertexAt(i).Z };
                    if (!this.geomFromFaces.verts.Contains(point))
                    {
                        this.geomFromFaces.verts.Add(point);
                    }
                }

                GeomFromFaces.MeshFace meshFace = new GeomFromFaces.MeshFace() {};
                meshFace.idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16);
                meshFace.surf_type = "surf_id";
                meshFace.surf_id = acEnt.Layer;
                meshFace.color = new int[] { (int)acEnt.Color.ColorValue.R, (int)acEnt.Color.ColorValue.G, (int)acEnt.Color.ColorValue.B };

                double[] vertsIndexes = new double[3];
                for (short i = 0; i < 3; i++)
                {
                    double[] point = new double[] { acEnt.GetVertexAt(i).X, acEnt.GetVertexAt(i).Y, acEnt.GetVertexAt(i).Z };
                    vertsIndexes[i] = this.geomFromFaces.verts.IndexOf(point);
                }
                meshFace.faceIndexes.Add(vertsIndexes);
                this.geomFromFaces.faces.Add(meshFace);

                Console.WriteLine(this.geomFromFaces.verts);
                /*
                // Add faces and vertices
                int[] faceArr = acEnt.FaceArray.ToArray();
                Point3dCollection vertices = acEnt.Vertices;
                int edges = 0;

                // Generate vertices
                foreach (Point3d vertice in vertices)
                {
                    geom.verts.Add(new double[] { vertice.X, vertice.Y, vertice.Z });
                }

                // Generate faces
                for (int x = 0; x < faceArr.Length; x = x + edges + 1)
                {
                    geom.faces.Add(new double[] { faceArr[x + 1] + 1, faceArr[x + 2] + 1, faceArr[x + 3] + 1 });
                    edges = faceArr[x];
                }

                this.geoms.Add(geom);
                */
            }
            // Here add geom from surfaces
            // 1. Add dictionary with egdges
            // 2. Add surfaces from edges
        }
        private class Ventilation
        {
            public class Surf
            {
                public string id { get; set; }
                public double idAC { get; set; }
                public Flow flow { get; set; }
                public int[] color { get; set; }
            }
            public class Obst
            {
                public class SurfObst
                {
                    public string type { get; set; }
                    public string surf_id { get; set; }
                }
                public double idAC { get; set; }
                public Xb xb { get; set; }
                public SurfObst surf { get; set; }
                public float elevation { get; set; }
            }
            public class Vent
            {
                public double idAC { get; set; }
                public Xb xb { get; set; }
                public Xyz xyz { get; set; }
                public string surf_id { get; set; }
                public float elevation { get; set; }
            }
            public class Jetfan
            {
                public double idAC { get; set; }
                public Xb xb { get; set; }
                public string surf_id { get; set; }
                public string direction { get; set; }
                public int[] color { get; set; }
            }

            public List<Surf> surfs { get; set; }
            public List<Obst> obsts { get; set; }
            public List<Vent> vents { get; set; }
            public List<Jetfan> jetfans { get; set; }

            public Ventilation()
            {
                this.surfs = new List<Surf>();
                this.obsts = new List<Obst>();
                this.vents = new List<Vent>();
                this.jetfans = new List<Jetfan>();
            }

            private float GetElevation(string layerName)
            {
                try
                {
                    float elevation = float.Parse(layerName.Substring(layerName.IndexOf("(") + 1, layerName.IndexOf(")") - layerName.IndexOf("(") - 1));
                    return elevation;
                }
                catch
                {
                    return 0;
                }
            }
            private string GetLayerId(string layerName)
            {
                string id = "";
                if (layerName.Contains("[") && layerName.Contains("]"))
                {
                    if (layerName.IndexOf("]") - layerName.IndexOf("[") - 1 > 0)
                        id = layerName.Substring(layerName.IndexOf("[") + 1, layerName.IndexOf("]") - layerName.IndexOf("[") - 1);
                }
                return id;
            }
            private int[] GetLayerColor(string layerName)
            {
                // Get the current document and database
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                // Start a transaction
                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // Open the Layer table for read
                    LayerTable acLyrTbl;
                    acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;
                    LayerTableRecord acLyrTblRec = acTrans.GetObject(acLyrTbl[layerName], OpenMode.ForRead) as LayerTableRecord;
                    return new int[] { (int)acLyrTblRec.Color.ColorValue.R, (int)acLyrTblRec.Color.ColorValue.G, (int)acLyrTblRec.Color.ColorValue.B };
                }
            }

            private Flow GetFlow(string layerName)
            {
                string id = "";
                if (layerName.Contains("[") && layerName.Contains("]"))
                {
                    if (layerName.IndexOf("]") - layerName.IndexOf("[") - 1 > 0)
                        id = layerName.Substring(layerName.IndexOf("[") + 1, layerName.IndexOf("]") - layerName.IndexOf("[") - 1);
                }
                double volFlow;
                bool isNumeric = double.TryParse(id, out volFlow);
                if (isNumeric)
                {
                    return new Flow
                    {
                        type = "volumeFlow",
                        volume_flow = Math.Round(volFlow / 3600, 2),
                        volume_flow_per_hour = volFlow
                    };
                }
                else
                {
                    return null;
                }
            }
            public void AddSurf(LayerTableRecord acLyrTblRec)
            {
                Surf surf = new Surf
                {
                    id = this.GetLayerId(acLyrTblRec.Name),
                    idAC = Convert.ToInt64(acLyrTblRec.ObjectId.Handle.ToString(), 16),
                    color = new int[] { (int)acLyrTblRec.Color.ColorValue.R, (int)acLyrTblRec.Color.ColorValue.G, (int)acLyrTblRec.Color.ColorValue.B }
                };
                if (!surf.id.StartsWith("jetfan"))
                {
                    this.surfs.Add(surf);
                }
            }
            public void AddSurf(string layer, Handle acHandle)
            {
                Surf surf = new Surf
                {
                    id = this.GetLayerId(layer),
                    idAC = Convert.ToInt64(acHandle.ToString(), 16),
                    flow = GetFlow(layer),
                    color = GetLayerColor(layer)
                };
                this.surfs.Add(surf);
            }
            public bool HasSurf(Ventilation ventilation, string layer)
            {
                foreach (var surf in ventilation.surfs)
                {
                    if (surf.id.Contains(this.GetLayerId(layer)))
                        return true;
                }
                return false;
            }

            public void AddVent(Entity acEnt)
            {
                Vent vent = new Vent()
                {
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    xb = new Xb
                    {
                        x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                        x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                        y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                        y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                        z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                        z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                    },
                    xyz = new Xyz
                    {
                        x = Math.Round(Math.Round(acEnt.GeometricExtents.MinPoint.X, 4) + ((Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4) - Math.Round(acEnt.GeometricExtents.MinPoint.X, 4)) / 2), 4),
                        y = Math.Round(Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4) + ((Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4) - Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4)) / 2), 4),
                        z = Math.Round(Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4) + ((Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4) - Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4)) / 2), 4)
                    },
                    surf_id = this.GetLayerId(acEnt.Layer),
                    elevation = this.GetElevation(acEnt.Layer)
                };
                this.vents.Add(vent);
            }
            public void AddJetfan(Entity acEnt)
            {
                Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                string dir = "";

                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    try
                    {
                        // Create a TypedValue array to define the filter criteria
                        // Select arrows in jetfans
                        TypedValue[] filterlist = new TypedValue[] {
                            new TypedValue(Convert.ToInt32(DxfCode.Operator), "<and"),
                            new TypedValue(Convert.ToInt32(DxfCode.LayerName), "!FDS_JETF*"),
                            new TypedValue(Convert.ToInt32(DxfCode.Operator), "<or"),
                            new TypedValue(Convert.ToInt32(DxfCode.Start), "POLYLINE"),
                            new TypedValue(Convert.ToInt32(DxfCode.Start), "LWPOLYLINE"),
                            new TypedValue(Convert.ToInt32(DxfCode.Start), "POLYLINE2D"),
                            new TypedValue(Convert.ToInt32(DxfCode.Start), "POLYLINE3d"),
                            new TypedValue(Convert.ToInt32(DxfCode.Operator), "or>"),
                            new TypedValue(Convert.ToInt32(DxfCode.Operator), "and>")
                        };
                        SelectionFilter filter = new SelectionFilter(filterlist);

                        // Request for objects to be selected in the drawing area
                        PromptSelectionResult acSSPrompt;
                        acSSPrompt = ed.SelectAll(filter);

                        // If the prompt status is OK, objects were selected
                        if (acSSPrompt.Status == PromptStatus.OK)
                        {
                            SelectionSet acSSet = acSSPrompt.Value;

                            // Step through the objects in the selection set
                            foreach (SelectedObject acSSObj in acSSet)
                            {
                                // Check to make sure a valid SelectedObject object was returned
                                if (acSSObj != null)
                                {
                                    // Open the selected object for read
#if BRX_APP
                                    Teigha.DatabaseServices.Polyline polyEnt = acTrans.GetObject(acSSObj.ObjectId, OpenMode.ForRead) as Teigha.DatabaseServices.Polyline;
#elif ARX_APP
                                    Autodesk.AutoCAD.DatabaseServices.Polyline polyEnt = acTrans.GetObject(acSSObj.ObjectId, OpenMode.ForRead) as Autodesk.AutoCAD.DatabaseServices.Polyline;
#elif GRX_APP
                                    Gssoft.Gscad.DatabaseServices.Polyline polyEnt = acTrans.GetObject(acSSObj.ObjectId, OpenMode.ForRead) as Gssoft.Gscad.DatabaseServices.Polyline;
#endif

                                    // Check if poly is in obst
                                    if (polyEnt.GeometricExtents.MinPoint.X > acEnt.GeometricExtents.MinPoint.X && polyEnt.GeometricExtents.MinPoint.Y > acEnt.GeometricExtents.MinPoint.Y && polyEnt.GeometricExtents.MaxPoint.X < acEnt.GeometricExtents.MaxPoint.X && polyEnt.GeometricExtents.MaxPoint.Y < acEnt.GeometricExtents.MaxPoint.Y)
                                    {
                                        // Check direction
                                        if (Math.Round(polyEnt.GetPoint3dAt(0).X, 6) == Math.Round(polyEnt.GetPoint3dAt(1).X, 6))
                                        {
                                            if (polyEnt.GetPoint3dAt(0).Y < polyEnt.GetPoint3dAt(1).Y)
                                                dir = "+y";
                                            else
                                                dir = "-y";
                                        }
                                        else if (Math.Round(polyEnt.GetPoint3dAt(0).Y, 6) == Math.Round(polyEnt.GetPoint3dAt(1).Y, 6))
                                        {
                                            if (polyEnt.GetPoint3dAt(0).X < polyEnt.GetPoint3dAt(1).X)
                                                dir = "+x";
                                            else
                                                dir = "-x";
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (System.Exception e)
                    {
                        ed.WriteMessage("\nProgram exception: " + e.ToString());
                    }
                }

                Jetfan jetfan = new Jetfan()
                {
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    xb = new Xb
                    {
                        x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                        x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                        y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                        y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                        z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                        z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),

                    },
                    surf_id = this.GetLayerId(acEnt.Layer),
                    direction = dir,
                    color = this.GetLayerColor(acEnt.Layer)
                };
                this.jetfans.Add(jetfan);
            }
        }
        private class Specie
        {
            public class Surf
            {
                public string id { get; set; }
                public double idAC { get; set; }
                public Flow flow { get; set; }
                public int[] color { get; set; }
            }
            public class Vent
            {
                public double idAC { get; set; }
                public Xb xb { get; set; }
                public string surf_id { get; set; }
                public float elevation { get; set; }
            }

            public List<Surf> surfs { get; set; }
            public List<Vent> vents { get; set; }

            public Specie()
            {
                this.surfs = new List<Surf>();
                this.vents = new List<Vent>();
            }

            private float GetElevation(string layerName)
            {
                try
                {
                    float elevation = float.Parse(layerName.Substring(layerName.IndexOf("(") + 1, layerName.IndexOf(")") - layerName.IndexOf("(") - 1));
                    return elevation;
                }
                catch
                {
                    return 0;
                }
            }
            private string GetLayerId(string layerName)
            {
                string id = "";
                if (layerName.Contains("[") && layerName.Contains("]"))
                {
                    if (layerName.IndexOf("]") - layerName.IndexOf("[") - 1 > 0)
                        id = layerName.Substring(layerName.IndexOf("[") + 1, layerName.IndexOf("]") - layerName.IndexOf("[") - 1);
                }
                return id;
            }
            private int[] GetLayerColor(string layerName)
            {
                // Get the current document and database
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                // Start a transaction
                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // Open the Layer table for read
                    LayerTable acLyrTbl;
                    acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;
                    LayerTableRecord acLyrTblRec = acTrans.GetObject(acLyrTbl[layerName], OpenMode.ForRead) as LayerTableRecord;
                    return new int[] { (int)acLyrTblRec.Color.ColorValue.R, (int)acLyrTblRec.Color.ColorValue.G, (int)acLyrTblRec.Color.ColorValue.B };
                }
            }

            private Flow GetFlow(string layerName)
            {
                string id = "";
                if (layerName.Contains("[") && layerName.Contains("]"))
                {
                    if (layerName.IndexOf("]") - layerName.IndexOf("[") - 1 > 0)
                        id = layerName.Substring(layerName.IndexOf("[") + 1, layerName.IndexOf("]") - layerName.IndexOf("[") - 1);
                }
                double volFlow;
                bool isNumeric = double.TryParse(id, out volFlow);
                if (isNumeric)
                {
                    return new Flow
                    {
                        type = "volumeFlow",
                        volume_flow = Math.Round(volFlow / 3600, 2),
                        volume_flow_per_hour = volFlow
                    };
                }
                else
                {
                    return null;
                }
            }
            public void AddSurf(LayerTableRecord acLyrTblRec)
            {
                Surf surf = new Surf
                {
                    id = this.GetLayerId(acLyrTblRec.Name),
                    idAC = Convert.ToInt64(acLyrTblRec.ObjectId.Handle.ToString(), 16),
                    color = new int[] { (int)acLyrTblRec.Color.ColorValue.R, (int)acLyrTblRec.Color.ColorValue.G, (int)acLyrTblRec.Color.ColorValue.B }
                };
                if (!surf.id.StartsWith("spec"))
                {
                    this.surfs.Add(surf);
                }
            }
            public void AddSurf(string layer, Handle acHandle)
            {
                Surf surf = new Surf
                {
                    id = this.GetLayerId(layer),
                    idAC = Convert.ToInt64(acHandle.ToString(), 16),
                    flow = GetFlow(layer),
                    color = GetLayerColor(layer)
                };
                this.surfs.Add(surf);
            }
            public bool HasSurf(Specie specie, string layer)
            {
                foreach (var surf in specie.surfs)
                {
                    if (surf.id.Contains(this.GetLayerId(layer)))
                        return true;
                }
                return false;
            }
            public void AddVent(Entity acEnt)
            {
                Vent vent = new Vent()
                {
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    xb = new Xb
                    {
                        x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                        x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                        y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                        y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                        z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                        z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                    },
                    surf_id = this.GetLayerId(acEnt.Layer),
                    elevation = this.GetElevation(acEnt.Layer)
                };
                this.vents.Add(vent);
            }
        }
        private class Output
        {
            public class Slcf
            {
                public string id { get; set; }
                public double idAC { get; set; }
                public string direction { get; set; }
                public double value { get; set; }
            }
            public class Devc
            {
                public string id { get; set; }
                public double idAC { get; set; }
                public string geometrical_type { get; set; }
                public Xb xb { get; set; }
                public Xyz xyz { get; set; }
            }

            public List<Slcf> slcfs { get; set; }
            public List<Devc> devcs { get; set; }

            public Output()
            {
                this.slcfs = new List<Slcf>();
                this.devcs = new List<Devc>();
            }

            private string GetLayerId(string layerName)
            {
                try
                {
                    string id = layerName.Substring(layerName.IndexOf("[") + 1, layerName.IndexOf("]") - layerName.IndexOf("[") - 1);
                    return id;
                }
                catch
                {
                    return "";
                }
            }

            public void AddSlcf(Entity acEnt)
            {
                string dir = "";
                double val = 0.0;
                if (acEnt.GeometricExtents.MinPoint.X == acEnt.GeometricExtents.MaxPoint.X)
                {
                    dir = "x";
                    val = acEnt.GeometricExtents.MinPoint.X;
                }
                else if (acEnt.GeometricExtents.MinPoint.Y == acEnt.GeometricExtents.MaxPoint.Y)
                {
                    dir = "y";
                    val = acEnt.GeometricExtents.MinPoint.Y;
                }
                else if (acEnt.GeometricExtents.MinPoint.Z == acEnt.GeometricExtents.MaxPoint.Z)
                {
                    dir = "z";
                    val = acEnt.GeometricExtents.MinPoint.Z;
                }

                Slcf slcf = new Slcf()
                {
                    id = this.GetLayerId(acEnt.Layer),
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    direction = dir,
                    value = Math.Round(val, 4)
                };
                this.slcfs.Add(slcf);

            }
            public void AddDevc(Entity acEnt)
            {
                string type = "";
                if (acEnt is ExtrudedSurface)
                {
                    type = "plane";
                }
                else if (acEnt is Solid3d)
                {
                    Solid3d sol = acEnt as Solid3d;
                    Gcad3DSolid solid = (Gcad3DSolid)sol.AcadObject;
                    
                    try
                    {
                        type = solid.SolidType.ToString();
                        if (type == "Box")
                            type = "volume";
                    }
                    catch (System.Exception)
                    {
                        type = "point";
                    }
                }
#if ARX_APP || GRX_APP
                else if(acEnt is Line || acEnt is Polyline)
#elif BRX_APP
                else if(acEnt is Line || acEnt is Teigha.DatabaseServices.Polyline)
#endif
                {
                    type = "linear";
                }

                Devc devc = new Devc()
                {
                    id = this.GetLayerId(acEnt.Layer),
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    geometrical_type = type,
                    xb = new Xb
                    {
                        x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                        x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                        y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                        y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                        z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                        z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                    },
                    xyz = new Xyz
                    {
                        x = Math.Round(Math.Round(acEnt.GeometricExtents.MinPoint.X, 4) + ((Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4) - Math.Round(acEnt.GeometricExtents.MinPoint.X, 4)) / 2), 4),
                        y = Math.Round(Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4) + ((Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4) - Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4)) / 2), 4),
                        z = Math.Round(Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4) + ((Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4) - Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4)) / 2), 4)
                    }
                };
                this.devcs.Add(devc);
            }
        }
        private class Fires
        {
            public class Fire
            {
                public double idAC { get; set; }
                public class Vent
                {
                    public Xb xb { get; set; }
                    public Xyz xyz { get; set; }
                }
                public string surf_id { get; set; }
                public Vent vent { get; set; }
                public int[] color { get; set; }
            }

            public List<Fire> fires { get; set; }

            public Fires()
            {
                this.fires = new List<Fire>();
            }

            public void AddFire(Entity acEnt)
            {
                Fire fire = new Fire
                {
                    surf_id = Layers.GetSurfaceName(acEnt.Layer),
                    idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16),
                    vent = new Fire.Vent
                    {
                        xb = new Xb
                        {
                            x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                            x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                            y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                            y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                            z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                            z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                        },
                        xyz = new Xyz
                        {
                            x = Math.Round(Math.Round(acEnt.GeometricExtents.MinPoint.X, 4) + ((Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4) - Math.Round(acEnt.GeometricExtents.MinPoint.X, 4)) / 2), 4),
                            y = Math.Round(Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4) + ((Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4) - Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4)) / 2), 4),
                            z = Math.Round(Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4) + ((Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4) - Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4)) / 2), 4)
                        }
                    },
                    color = Layers.GetLayerColor(acEnt.Layer)
                };
                this.fires.Add(fire);
            }
        }

        private class FdsObject
        {
            public Geometry geometry { get; set; }
            public Ventilation ventilation { get; set; }
            public Specie specie { get; set; }
            public Output output { get; set; }
            public Fires fires { get; set; }
            public string acFile { get; set; }
            public string acPath { get; set; }
        }

        public Object DataFDS()
        {
            Geometry geometry = new Geometry();
            Ventilation ventilation = new Ventilation();
            Specie specie = new Specie();
            Output output = new Output();
            Fires fires = new Fires();

            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            using (DocumentLock docLock = acDoc.LockDocument())
            {
                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // Create a TypedValue array to define the filter criteria
                    TypedValue[] filterlist = new TypedValue[1];
                    filterlist[0] = new TypedValue(8, "!FDS*");
                    SelectionFilter filter = new SelectionFilter(filterlist);

                    // Request for objects to be selected in the drawing area
                    PromptSelectionResult acSSPrompt;
                    acSSPrompt = ed.SelectAll(filter);

                    // If the prompt status is OK, objects were selected
                    if (acSSPrompt.Status == PromptStatus.OK)
                    {
                        SelectionSet acSSet = acSSPrompt.Value;

                        // Step through the objects in the selection set
                        for (int i = 0; i < acSSet.Count; i++)
                        {
                            // Check to make sure a valid SelectedObject object was returned
                            if (acSSet[i] != null)
                            {
                                // Open the selected object for write
                                Entity acEnt = acTrans.GetObject(acSSet[i].ObjectId, OpenMode.ForRead) as Entity;

                                try
                                {

                                    if (acEnt.Layer.Contains("!FDS_OBST") || acEnt.Layer.Contains("!FDS_GEOM"))
                                    {
                                        // Check if complex geometry
                                        if (acEnt.GetType() == typeof(SubDMesh))
                                        {
                                            geometry.AddGeom((SubDMesh)acEnt);

                                            if (geometry.surfs.Count > 0)
                                            {
                                                if (!geometry.HasSurf(geometry, acEnt.Layer))
                                                    geometry.AddSurf(acEnt.Layer, acEnt.Handle);
                                            }
                                            else
                                            {
                                                geometry.AddSurf(acEnt.Layer, acEnt.Handle);
                                            }
                                        }
                                        else if (acEnt.GetType() == typeof(Face))
                                        {
                                            geometry.AddGeomFromFaces((Face)acEnt);
                                        }
                                        else
                                        {
                                            geometry.AddObst(acEnt);

                                            if (geometry.surfs.Count > 0)
                                            {
                                                if (!geometry.HasSurf(geometry, acEnt.Layer))
                                                    geometry.AddSurf(acEnt.Layer, acEnt.Handle);
                                            }
                                            else
                                            {
                                                geometry.AddSurf(acEnt.Layer, acEnt.Handle);
                                            }
                                        }
                                    }
                                    else if (acEnt.Layer.Contains("!FDS_HOLE"))
                                    {
                                        geometry.AddHole(acEnt);
                                    }
                                    else if (acEnt.Layer.Contains("!FDS_MESH"))
                                    {
                                        if (acEnt.Layer.Contains("open"))
                                        {
                                            geometry.AddOpen(acEnt);
                                        }
                                        else
                                        {
                                            geometry.AddMesh(acEnt);
                                        }
                                    }
                                    else if (acEnt.Layer.Contains("!FDS_FIRE"))
                                    {
                                        fires.AddFire(acEnt);
                                    }
                                    else if (acEnt.Layer.Contains("!FDS_VENT"))
                                    {
                                        if (acEnt is ExtrudedSurface)
                                        {
                                            ventilation.AddVent(acEnt);
                                            if (ventilation.surfs.Count > 0)
                                            {
                                                if (!ventilation.HasSurf(ventilation, acEnt.Layer))
                                                    ventilation.AddSurf(acEnt.Layer, acEnt.Handle);
                                            }
                                            else
                                            {
                                                ventilation.AddSurf(acEnt.Layer, acEnt.Handle);
                                            }
                                        }
                                    }
                                    else if (acEnt.Layer.Contains("!FDS_JETF") && acEnt is Solid3d)
                                    {
                                        ventilation.AddJetfan(acEnt);
                                    }
                                    else if (acEnt.Layer.Contains("!FDS_SLCF"))
                                    {
                                        output.AddSlcf(acEnt);
                                    }
                                    else if (acEnt.Layer.Contains("!FDS_DEVC"))
                                    {
                                        output.AddDevc(acEnt);
                                    }
                                    else if (acEnt.Layer.Contains("!FDS_SPEC"))
                                    {
                                        if (acEnt is ExtrudedSurface)
                                        {
                                            specie.AddVent(acEnt);
                                            if (specie.surfs.Count > 0)
                                            {
                                                if (!specie.HasSurf(specie, acEnt.Layer))
                                                    specie.AddSurf(acEnt.Layer, acEnt.Handle);
                                            }
                                            else
                                            {
                                                specie.AddSurf(acEnt.Layer, acEnt.Handle);
                                            }
                                        }
                                    }
                                    else if (acEnt.Layer.Contains("!FDS_GEOM"))
                                    {

                                    }
                                }
                                catch (System.Exception e)
                                {
                                    ed.WriteMessage(e.ToString());
                                }
                            }
                        }
                    }

                    FdsObject fdsObject = new FdsObject()
                    {
                        geometry = geometry,
                        fires = fires,
                        ventilation = ventilation,
                        specie = specie,
                        output = output,
                        acFile = acApp.GetSystemVariable("DWGNAME").ToString(),
                        acPath = acApp.GetSystemVariable("DWGPREFIX").ToString()
                    };

                    //String jsonF = JsonConvert.SerializeObject(geom);
                    return fdsObject;
                    // Dispose of the transaction
                }
            }
        }

        public Object SelectObject()
        {
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            dynamic data = new System.Dynamic.ExpandoObject();

            using (DocumentLock docLock = acDoc.LockDocument())
            {
                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {

                    PromptSelectionOptions options = new PromptSelectionOptions();
                    options.SingleOnly = true;
                    options.SinglePickInSpace = true;

                    // Request for objects to be selected in the drawing area
                    PromptSelectionResult acSSPrompt = acDoc.Editor.GetSelection(options);

                    // If the prompt status is OK, objects were selected
                    if (acSSPrompt.Status == PromptStatus.OK)
                    {
                        SelectionSet acSSet = acSSPrompt.Value;

                        // Step through the objects in the selection set
                        SelectedObject acSSObj = acSSet[0];
                        // Check to make sure a valid SelectedObject object was returned
                        if (acSSObj != null)
                        {
                            // Open the selected object for write
                            Entity acEnt = acTrans.GetObject(acSSObj.ObjectId, OpenMode.ForRead) as Entity;
                            if (acEnt.Layer.Contains("!FDS"))
                            {
                                data.idAC = ImportUtils.GetAcId(acEnt);
                                acEnt.Highlight();
                            }
                        }
                    }
                }
            }
            return data;
        }

        [CommandMethod("fExport", CommandFlags.Session)]
        public void fExport()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Object data = DataFDS();

                ed.WriteMessage("\nSending FDS objects ...");
                Websocket.acWebSocketMessage message = new acWebSocketMessage("success", "fExport", data, null);
#if DEBUG
                ed.WriteMessage("\nMessageId: " + message.getId());
#endif
                acWebSocketMessage answer = acWebSocketCtrl.syncCtrl.sendMessageAndWaitSync(message);
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nWizFDS exception:" + e.ToString());
            }
        }

        [CommandMethod("fSelect")]
        public void fSelect()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Object data = SelectObject();
                ed.WriteMessage(JsonConvert.SerializeObject(data, Formatting.Indented).ToString());

                if (data.ToString() != "{}")
                {
                    ed.WriteMessage("\nSelecting FDS object ...");
                    acWebSocketMessage message = new acWebSocketMessage("success", "selectObjectAc", data, null);
#if DEBUG
                    ed.WriteMessage("\nMessageId: " + message.getId());
#endif
                    acWebSocketMessage answer = acWebSocketCtrl.syncCtrl.sendMessageAndWaitSync(message);
                }
                else
                {
                    ed.WriteMessage("\nNothing selected");
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nWizFDS exception:\n\t" + e.ToString());
            }

        }

    }

}
