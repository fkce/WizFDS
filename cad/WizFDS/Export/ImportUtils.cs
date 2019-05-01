#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Teigha.BoundaryRepresentation;
using Teigha.Colors;
using Teigha.DatabaseServices;
using Bricscad.EditorInput;
using Teigha.Geometry;
using Teigha.GraphicsInterface;
using Teigha.GraphicsSystem;
using Bricscad.PlottingServices;
using Bricscad.Runtime;
using Teigha.Runtime;
using Bricscad.Windows;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.Colors;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
#endif


using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace WizFDS.Export
{
    public class ImportUtils
    {
        public static int currentFloor = 0;

        // WebSocket handle
        public static Handle GetHandleFromIdAC(long idAC)
        {
            long ln = Convert.ToInt64(idAC.ToString("X3"), 16);
            Handle hn = new Handle(ln);
            return hn;
        }
        public static void UpdateSolid3D(ObjectId objectId, dynamic xb)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            Point3d p1 = new Point3d(Convert.ToDouble(xb.x1), Convert.ToDouble(xb.y1), Convert.ToDouble(xb.z1));
            Point3d p2 = new Point3d(Convert.ToDouble(xb.x2), Convert.ToDouble(xb.y2), Convert.ToDouble(xb.z2));

            //acCurDb.TryGetObjectId();
            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                Solid3d acSol3DBox = (Solid3d)acTrans.GetObject(objectId, OpenMode.ForWrite);
                acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs(p2.Z - p1.Z));
                Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), p1.Z + ((p2.Z - p1.Z) / 2));
                acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));
                acSol3DBox.Draw();
                acTrans.Commit();
                ed.UpdateScreen();
            }
        }
        public static void UpdateSurface(ObjectId objectId, dynamic xb)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            Point3d minPoint = new Point3d(Convert.ToDouble(xb.x1), Convert.ToDouble(xb.y1), Convert.ToDouble(xb.z1));
            Point3d maxPoint = new Point3d(Convert.ToDouble(xb.x2), Convert.ToDouble(xb.y2), Convert.ToDouble(xb.z2));

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Block table record for read
                BlockTable acBlkTbl;
                acBlkTbl = acTrans.GetObject(acCurDb.BlockTableId,
                                                OpenMode.ForRead) as BlockTable;

                // Open the Block table record Model space for write
                BlockTableRecord acBlkTblRec;
                acBlkTblRec = acTrans.GetObject(acBlkTbl[BlockTableRecord.ModelSpace],
                                                OpenMode.ForWrite) as BlockTableRecord;

                Point3d pStart = minPoint;
                Point3d pEnd = new Point3d(maxPoint.X, maxPoint.Y, minPoint.Z);
                Vector3d vec = new Vector3d(0, 0, maxPoint.Z - minPoint.Z);

                if (minPoint.Z == maxPoint.Z)
                {
                    pStart = minPoint;
                    pEnd = new Point3d(maxPoint.X, minPoint.Y, maxPoint.Z);
                    vec = new Vector3d(0, maxPoint.Y - minPoint.Y, 0);
                }

                // Create polyline
                Polyline3d poly = new Polyline3d();
                acBlkTblRec.AppendEntity(poly);
                acTrans.AddNewlyCreatedDBObject(poly, true);
                // Add vertex
                foreach (Point3d pnt in new List<Point3d>() { pStart, pEnd })
                {
                    PolylineVertex3d vex3d = new PolylineVertex3d(pnt);
                    poly.AppendVertex(vex3d);
                    acTrans.AddNewlyCreatedDBObject(vex3d, true);
                }
                poly.Closed = false;
#if BRX_APP
                ExtrudedSurface extrSurf = (Teigha.DatabaseServices.ExtrudedSurface)acTrans.GetObject(objectId, OpenMode.ForWrite);
#elif ARX_APP
                ExtrudedSurface extrSurf = (Autodesk.AutoCAD.DatabaseServices.ExtrudedSurface)acTrans.GetObject(objectId, OpenMode.ForWrite);
#endif
                extrSurf.SetDatabaseDefaults();
                SweepOptions sweepOpts = new SweepOptions();
                extrSurf.CreateExtrudedSurface(poly, vec, sweepOpts);
                extrSurf.UIsoLineDensity = 0;
                extrSurf.VIsoLineDensity = 0;
                extrSurf.Draw();
                poly.Erase();
                acTrans.Commit();
                ed.UpdateScreen();
            }
        }

        public static void SelectObject(ObjectId objectId)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            ObjectId[] ids = new ObjectId[1];
            ids[0] = objectId;
            using (DocumentLock docLock = acDoc.LockDocument())
            {
#if BRX_APP
                Bricscad.Internal.Utils.SelectObjects(ids);
#elif ARX_APP
                Autodesk.AutoCAD.Internal.Utils.SelectObjects(ids);
#endif
            }
            ed.UpdateScreen();
        }

        public static string CreateObstLayer(string webLayer, string elevation)
        {
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            string layerName;
            if (elevation != "")
            {
                layerName = "!FDS_OBST[" + webLayer + "](" + elevation + ")";
            }
            else
            {
                layerName = "!FDS_OBST[" + webLayer + "](0)";
            }
            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;

                if (acLyrTbl.Has(layerName))
                {
                    return layerName;
                }
                else
                {
                    LayerTableRecord acLyrTblRec = new LayerTableRecord();
                    Random r = new Random();
                    acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, (Int16)(r.Next(225)));
                    acLyrTblRec.Name = layerName;
                    // Upgrade the Layer table for write
                    acLyrTbl.UpgradeOpen();
                    // Append the new layer to the Layer table and the transaction
                    acLyrTbl.Add(acLyrTblRec);
                    acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                    acTrans.Commit();
                    return layerName;
                }
            }
        }
        public static string UpdateObstLayer(ObjectId objectId, string webLayer)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // This example returns the layer table for the current database
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;
                string layerName = "";
                string oldLayerName = "";

                // Pobierz starą nazwę warstwy
                LayerTableRecord acLyrTblRecOld;
                acLyrTblRecOld = acTrans.GetObject(objectId, OpenMode.ForRead) as LayerTableRecord;

                Regex regEx = new Regex(@"\[(.+)\]", RegexOptions.IgnoreCase);
                Match match = regEx.Match(acLyrTblRecOld.Name);
                ed.WriteMessage("Match success: " + match.Success.ToString());
                if (match.Success)
                {
                    System.Text.RegularExpressions.Group group = match.Groups[1];
                    oldLayerName = group.ToString();
                }
                ed.WriteMessage("Old layer: " + oldLayerName);


                // Step through the Layer table and print each layer name
                foreach (ObjectId acObjId in acLyrTbl)
                {
                    LayerTableRecord acLyrTblRec;
                    acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;

                    if (acLyrTblRec.Name.Contains(oldLayerName))
                    {
                        regEx = new Regex(@"\((.)\)", RegexOptions.IgnoreCase);
                        match = regEx.Match(acLyrTblRec.Name);
                        if (match.Success)
                        {
                            System.Text.RegularExpressions.Group group = match.Groups[1];
                            Int32.TryParse(group.ToString(), out currentFloor);
                            layerName = "!FDS_OBST[" + webLayer + "](" + currentFloor + ")";
                        }
                        acLyrTblRec.UpgradeOpen();
                        acLyrTblRec.Name = layerName;
                        Random r = new Random();
                        acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, (Int16)(r.Next(225)));

                        ed.WriteMessage("\n" + acLyrTblRec.Name);
                    }
                }
                acTrans.Commit();
                return "";
            }
        }
        public static void DeleteObstLayer(ObjectId objectId)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            // Upewnij sie czy istnieje warstwa inert
            Utils.Layers.CreateLayer("!FDS_OBST[inert](0)");

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                                OpenMode.ForRead) as LayerTable;

                LayerTableRecord acLyrTblRec;
                acLyrTblRec = acTrans.GetObject(objectId, OpenMode.ForWrite) as LayerTableRecord;
                string sLayerName = acLyrTblRec.Name;


                if (acLyrTbl.Has(sLayerName) == true)
                {
                    Regex regEx = new Regex(@"\[(.+)\]", RegexOptions.IgnoreCase);
                    Match match = regEx.Match(sLayerName);
                    ed.WriteMessage("\nMatch success: " + match.Success.ToString());
                    string layerName = "";
                    if (match.Success)
                    {
                        System.Text.RegularExpressions.Group group = match.Groups[1];
                        layerName = group.ToString();
                    }
                    ed.WriteMessage("\nOld layer: " + layerName);

                    TypedValue[] filterlist = new TypedValue[1];
                    filterlist[0] = new TypedValue(8, "!FDS_OBST*" + layerName + "*");
                    SelectionFilter filter = new SelectionFilter(filterlist);

                    // Request for objects to be selected in the drawing area
                    PromptSelectionResult acSSPrompt;
                    acSSPrompt = ed.SelectAll(filter);

                    if (acSSPrompt.Status == PromptStatus.OK)
                    {
                        SelectionSet acSSet = acSSPrompt.Value;

                        // Step through the objects in the selection set
                        foreach (SelectedObject acSSObj in acSSet)
                        {
                            // Check to make sure a valid SelectedObject object was returned
                            if (acSSObj != null)
                            {
                                // Open the selected object for write
                                Entity acEnt = acTrans.GetObject(acSSObj.ObjectId, OpenMode.ForWrite) as Entity;
                                acEnt.Layer = "!FDS_OBST[inert](0)";
                            }
                        }
                    }

                    ObjectIdCollection acObjIdColl = new ObjectIdCollection();
                    // Step through the Layer table and print each layer name
                    foreach (ObjectId acObjId in acLyrTbl)
                    {
                        acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;

                        if (acLyrTblRec.Name.Contains("!FDS_OBST[" + layerName + "]"))
                        {

                            acObjIdColl.Add(acLyrTbl[acLyrTblRec.Name]);

                            ed.WriteMessage("\n" + acLyrTblRec.Name);
                        }
                    }

                    // Check to see if it is safe to erase layer
                    acCurDb.Purge(acObjIdColl);

                    if (acObjIdColl.Count > 0)
                    {
                        foreach (ObjectId acObjId in acObjIdColl)
                        {
                            LayerTableRecord acLyrObstTblRec = acTrans.GetObject(acObjId, OpenMode.ForWrite) as LayerTableRecord;
                            try
                            {
                                // Erase the unreferenced layer
                                acLyrObstTblRec.Erase(true);
                                // Save the changes and dispose of the transaction
                            }
                            catch (System.Exception e)
                            {
                                // Layer could not be deleted
                                ed.WriteMessage("WizFDS exception:\n" + e.Message);
                            }
                        }
                        acTrans.Commit();
                    }

                }
            }

        }

        public static string UpdateVentLayer(ObjectId objectId, string webLayer)
        {
            // TODO: trzeba zalozyc filtr po webLayer i zmieniac wszystkie warstwy w petli poniwaz moze byc kilka tych samych warstw na roznych pietrach 
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // This example returns the layer table for the current database
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;
                string layerName = "";
                string oldLayerName = "";

                // Pobierz starą nazwę warstwy
                LayerTableRecord acLyrTblRecOld;
                acLyrTblRecOld = acTrans.GetObject(objectId, OpenMode.ForRead) as LayerTableRecord;

                Regex regEx = new Regex(@"\[(.+)\]", RegexOptions.IgnoreCase);
                Match match = regEx.Match(acLyrTblRecOld.Name);
                ed.WriteMessage("Match success: " + match.Success.ToString());
                if (match.Success)
                {
                    System.Text.RegularExpressions.Group group = match.Groups[1];
                    oldLayerName = group.ToString();
                }
                ed.WriteMessage("Old layer: " + oldLayerName);

                // Step through the Layer table and print each layer name
                foreach (ObjectId acObjId in acLyrTbl)
                {
                    LayerTableRecord acLyrTblRec;
                    acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;

                    if (acLyrTblRec.Name.Contains(oldLayerName))
                    {
                        regEx = new Regex(@"\((.)\)", RegexOptions.IgnoreCase);
                        match = regEx.Match(acLyrTblRec.Name);
                        if (match.Success)
                        {
                            System.Text.RegularExpressions.Group group = match.Groups[1];
                            Int32.TryParse(group.ToString(), out currentFloor);
                            layerName = "!FDS_VENT[" + webLayer + "](" + currentFloor + ")";
                        }
                        acLyrTblRec.UpgradeOpen();
                        acLyrTblRec.Name = layerName;
                        Random r = new Random();
                        acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, (Int16)(r.Next(225)));

                        ed.WriteMessage("\n" + acLyrTblRec.Name);
                    }
                }
                acTrans.Commit();
                return "";
            }
        }

        public static string UpdateSpecLayer(ObjectId objectId, string webLayer)
        {
            // TODO: trzeba zalozyc filtr po webLayer i zmieniac wszystkie warstwy w petli poniwaz moze byc kilka tych samych warstw na roznych pietrach 
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // This example returns the layer table for the current database
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;
                string layerName = "";
                string oldLayerName = "";

                // Pobierz starą nazwę warstwy
                LayerTableRecord acLyrTblRecOld;
                acLyrTblRecOld = acTrans.GetObject(objectId, OpenMode.ForRead) as LayerTableRecord;

                Regex regEx = new Regex(@"\[(.+)\]", RegexOptions.IgnoreCase);
                Match match = regEx.Match(acLyrTblRecOld.Name);
                ed.WriteMessage("Match success: " + match.Success.ToString());
                if (match.Success)
                {
                    System.Text.RegularExpressions.Group group = match.Groups[1];
                    oldLayerName = group.ToString();
                }
                ed.WriteMessage("Old layer: " + oldLayerName);

                // Step through the Layer table and print each layer name
                foreach (ObjectId acObjId in acLyrTbl)
                {
                    LayerTableRecord acLyrTblRec;
                    acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;

                    if (acLyrTblRec.Name.Contains(oldLayerName))
                    {
                        regEx = new Regex(@"\((.)\)", RegexOptions.IgnoreCase);
                        match = regEx.Match(acLyrTblRec.Name);
                        if (match.Success)
                        {
                            System.Text.RegularExpressions.Group group = match.Groups[1];
                            Int32.TryParse(group.ToString(), out currentFloor);
                            layerName = "!FDS_SPEC[" + webLayer + "](" + currentFloor + ")";
                        }
                        acLyrTblRec.UpgradeOpen();
                        acLyrTblRec.Name = layerName;
                        Random r = new Random();
                        acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, (Int16)(r.Next(225)));

                        ed.WriteMessage("\n" + acLyrTblRec.Name);
                    }
                }
                acTrans.Commit();
                return "";
            }
        }

        public static string CreateVentLayer(string webLayer)
        {
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            string layerName;
            layerName = "!FDS_VENT[" + webLayer + "]";
            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;

                if (acLyrTbl.Has(layerName))
                {
                    return layerName;
                }
                else
                {
                    LayerTableRecord acLyrTblRec = new LayerTableRecord();
                    //acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                    acLyrTblRec.Name = layerName;
                    // Upgrade the Layer table for write
                    acLyrTbl.UpgradeOpen();
                    // Append the new layer to the Layer table and the transaction
                    acLyrTbl.Add(acLyrTblRec);
                    acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                    acTrans.Commit();
                    return layerName;
                }
            }
        }
        public static string CreateSlcfLayer(string webLayer)
        {
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            string layerName;
            layerName = "!FDS_SLCF[" + webLayer + "]";
            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;

                if (acLyrTbl.Has(layerName))
                {
                    return layerName;
                }
                else
                {
                    LayerTableRecord acLyrTblRec = new LayerTableRecord();
                    //acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                    acLyrTblRec.Name = layerName;
                    // Upgrade the Layer table for write
                    acLyrTbl.UpgradeOpen();
                    // Append the new layer to the Layer table and the transaction
                    acLyrTbl.Add(acLyrTblRec);
                    acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                    acTrans.Commit();
                    return layerName;
                }
            }
        }
        public static string CreateDevcLayer(string webLayer)
        {
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            string layerName;
            layerName = "!FDS_DEVC[" + webLayer + "]";
            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;

                if (acLyrTbl.Has(layerName))
                {
                    return layerName;
                }
                else
                {
                    LayerTableRecord acLyrTblRec = new LayerTableRecord();
                    //acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                    acLyrTblRec.Name = layerName;
                    // Upgrade the Layer table for write
                    acLyrTbl.UpgradeOpen();
                    // Append the new layer to the Layer table and the transaction
                    acLyrTbl.Add(acLyrTblRec);
                    acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                    acTrans.Commit();
                    return layerName;
                }
            }
        }
        public static string CreateFireLayer(string webLayer)
        {
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            string layerName;
            layerName = "!FDS_FIRE[" + webLayer + "]";
            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;

                if (acLyrTbl.Has(layerName))
                {
                    return layerName;
                }
                else
                {
                    LayerTableRecord acLyrTblRec = new LayerTableRecord();
                    //acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                    acLyrTblRec.Name = layerName;
                    // Upgrade the Layer table for write
                    acLyrTbl.UpgradeOpen();
                    // Append the new layer to the Layer table and the transaction
                    acLyrTbl.Add(acLyrTblRec);
                    acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                    acTrans.Commit();
                    return layerName;
                }
            }
        }
        public static string CreateJetfanLayer(string webLayer)
        {
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            string layerName;
            layerName = "!FDS_JETF[" + webLayer + "]";
            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;

                if (acLyrTbl.Has(layerName))
                {
                    return layerName;
                }
                else
                {
                    LayerTableRecord acLyrTblRec = new LayerTableRecord();
                    //acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                    acLyrTblRec.Name = layerName;
                    // Upgrade the Layer table for write
                    acLyrTbl.UpgradeOpen();
                    // Append the new layer to the Layer table and the transaction
                    acLyrTbl.Add(acLyrTblRec);
                    acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                    acTrans.Commit();
                    return layerName;
                }
            }
        }

        public static void UpdateObjectLayer(ObjectId objectId, string layerName)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                Solid3d acSol3DBox = (Solid3d)acTrans.GetObject(objectId, OpenMode.ForWrite);
                acSol3DBox.Layer = layerName;
                acTrans.Commit();
                ed.UpdateScreen();
            }

        }
        public static void DeleteLayer(ObjectId objectId)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            // Upewnij sie czy istnieje warstwa inert
            Utils.Layers.CreateLayer("!FDS_OBST[inert](0)");

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                                OpenMode.ForRead) as LayerTable;

                LayerTableRecord acLyrTblRec;
                acLyrTblRec = acTrans.GetObject(objectId, OpenMode.ForWrite) as LayerTableRecord;
                string sLayerName = acLyrTblRec.Name;


                if (acLyrTbl.Has(sLayerName) == true)
                {

                    Regex regEx = new Regex(@"\[(.+)\]", RegexOptions.IgnoreCase);
                    Match match = regEx.Match(sLayerName);
                    ed.WriteMessage("\nMatch success: " + match.Success.ToString());
                    string layerName = "";
                    if (match.Success)
                    {
                        System.Text.RegularExpressions.Group group = match.Groups[1];
                        layerName = group.ToString();
                    }
                    ed.WriteMessage("\nOld layer: " + layerName);

                    TypedValue[] filterlist = new TypedValue[1];
                    filterlist[0] = new TypedValue(8, "!FDS*" + layerName + "*");
                    SelectionFilter filter = new SelectionFilter(filterlist);

                    // Request for objects to be selected in the drawing area
                    PromptSelectionResult acSSPrompt;
                    acSSPrompt = ed.SelectAll(filter);

                    if (acSSPrompt.Status == PromptStatus.OK)
                    {
                        SelectionSet acSSet = acSSPrompt.Value;

                        // Step through the objects in the selection set
                        foreach (SelectedObject acSSObj in acSSet)
                        {
                            // Check to make sure a valid SelectedObject object was returned
                            if (acSSObj != null)
                            {
                                // Open the selected object for write
                                Entity acEnt = acTrans.GetObject(acSSObj.ObjectId, OpenMode.ForWrite) as Entity;
                                acEnt.Layer = "!FDS_OBST[inert](0)";
                            }
                        }
                    }

                    // Check to see if it is safe to erase layer
                    ObjectIdCollection acObjIdColl = new ObjectIdCollection();
                    acObjIdColl.Add(acLyrTbl[sLayerName]);
                    acCurDb.Purge(acObjIdColl);

                    if (acObjIdColl.Count > 0)
                    {
                        try
                        {
                            // Erase the unreferenced layer
                            acLyrTblRec.Erase(true);
                            // Save the changes and dispose of the transaction
                            acTrans.Commit();
                        }
                        catch (System.Exception e)
                        {
                            // Layer could not be deleted
                            ed.WriteMessage("WizFDS exception:\n" + e.Message);
                        }
                    }
                }
            }

        }

        public static long GetAcId(Entity acEnt)
        {
            long idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16);
            return idAC;
        }

    }
}
