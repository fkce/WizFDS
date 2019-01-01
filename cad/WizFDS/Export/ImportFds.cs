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
using BricscadDb;
using BricscadApp;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.Colors;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
#endif


using System;
using Newtonsoft.Json;
using WizFDS.Websocket;

namespace WizFDS.Export
{
    public struct isCreatedObject
    {
        public bool isCreated;
        public dynamic acObj;
    }

    public class ImportFds
    {

        public static void SyncAllWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            dynamic fds = data.fds_object;

            string jsonF = JsonConvert.SerializeObject(fds.geometry.obsts, Formatting.Indented);
            ed.WriteMessage(jsonF);

            // TODO: zrobić sprawdzenie, czy powstały wszystkie elementy ...
            // Usunięcie wszystkich elementów typu FDS
            // Surfs???

            // Geometry
            foreach(dynamic obst in fds.geometry.obsts)
            {
                CreateObstWeb(obst);
            }
            foreach(dynamic hole in fds.geometry.holes)
            {
                CreateHoleWeb(hole);
            }
            foreach(dynamic mesh in fds.geometry.meshes)
            {
                CreateMeshWeb(mesh);
            }

            // Output
            foreach(dynamic devc in fds.output.devcs)
            {
                CreateMeshWeb(devc);
            }
            foreach(dynamic slcf in fds.output.slcfs)
            {
                CreateMeshWeb(slcf);
            }

            Utils.Utils.ZoomExtents();
            return;

        }
        public static void SyncLayersWeb(dynamic data)
        {
            // Get the current document and database
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                                OpenMode.ForRead) as LayerTable;

                dynamic obstLayers = null;
                dynamic fireLayers = null;
                dynamic ventLayers = null;
                dynamic devcLayers = null;
                dynamic slcfLayers = null;
                try
                {
                    obstLayers = data.geometry.obsts;
                    //fireLayers = data.fires.fires;
                    //ventLayers = data.ventilation;
                    //devcLayers = data.output.devcs;
                    //slcfLayers = data.output.slcfs;
                }
                catch (System.Exception e)
                {
                    ed.WriteMessage("\nProgram exception: " + e.ToString());
                }


                // dla kazdej warstwy sprawdz czy istnieje idAC
                // jezeli nie to sprawdz czy nie istnieje o takiej nazwie

                try
                {
                    foreach (dynamic obst in obstLayers)
                    {
                        ed.WriteMessage("\nObst idAC: " + obst.idAC.ToString());
                        ed.WriteMessage("\nLayer layer: " + obst.surf.surf_id.ToString());
                        ed.WriteMessage("\nLayer elevation: " + obst.elevation.ToString());
                        ed.WriteMessage("\n\n");

                        //string layerName = "!FDS_OBST_" + obst.id.ToString();

                        //if (obst.idAC.ToString() != "" && obst.idAC != null)
                        //{
                        //    ObjectId idAC = new ObjectId(Convert.ToInt64(obst.idAC));
                        //    if (acLyrTbl.Has(idAC))
                        //    {
                        //        ed.WriteMessage("\nLayer exists");
                        //    }
                        //    else
                        //    {
                        //        Utils.Utils.CreateLayer(layerName);
                        //        // dodaj warstwe tutaj i nadaj nowe idAC
                        //    }
                        //}
                        //else if(layer.id.ToString() != "" && layer.id != null)
                        //{
                        //    if (acLyrTbl.Has(layer.id.ToString()))
                        //    {
                        //        ed.WriteMessage("\nLayer exists");
                        //    }
                        //    else
                        //    {
                        //        Utils.Utils.CreateLayer(layerName);
                        //        // dodaj warstwe tutaj i nadaj nowe idAC
                        //    }
                        //}
                    }
                }
                catch (System.Exception e)
                {
                    // Layer could not be deleted
                    ed.WriteMessage("\nProgram exception: " + e.ToString());
                }

                /*
                foreach (dynamic layer in surfLayers)
                {
                    // tutaj zlozenie nazwy warstwy
                    if (acLyrTbl.Has(layer.id) == true)
                    {
                        // Check to see if it is safe to erase layer
                        ObjectIdCollection acObjIdColl = new ObjectIdCollection();
                        acObjIdColl.Add(acLyrTbl[layer.id]);
                        acCurDb.Purge(acObjIdColl);

                        if (acObjIdColl.Count > 0)
                        {
                            LayerTableRecord acLyrTblRec;
                            acLyrTblRec = acTrans.GetObject(acObjIdColl[0],
                                                            OpenMode.ForWrite) as LayerTableRecord;

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
                                ed.WriteMessage("\nProgram exception: " + e.ToString());
                            }
                        }
                        else
                        {

                        }

                    }
                }
                */
            }
        }

        public static bool CreateLibraryLayersWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            try
            {
                dynamic surfs = null;
                dynamic ventsurfs = null;
                dynamic fires = null;
                dynamic slcfs = null;
                dynamic devcs = null;
                dynamic jetfans = null;

                surfs = data.surfs;
                ventsurfs = data.ventsurfs;
                fires = data.fires;
                slcfs = data.slcfs;
                devcs = data.devcs;
                jetfans = data.jetfans;


                using (DocumentLock docLock = acDoc.LockDocument())
                {

                    Utils.Utils.Init();

                    if (data.surfs != null && data.surfs.ToString() != "")
                    {
                        foreach(dynamic layer in surfs)
                        {
                            ImportUtils.CreateObstLayer(layer.id.ToString(),  "0");
                        }
                    }

                    if (data.ventsurfs != null && data.ventsurfs.ToString() != "")
                    {
                        foreach(dynamic layer in ventsurfs)
                        {
                            ImportUtils.CreateVentLayer(layer.id.ToString());
                        }
                    }

                    if (data.fires != null && data.fires.ToString() != "")
                    {
                        foreach(dynamic layer in fires)
                        {
                            ImportUtils.CreateFireLayer(layer.id.ToString());
                        }
                    }

                    if (data.slcfs != null && data.slcfs.ToString() != "")
                    {
                        foreach(dynamic layer in slcfs)
                        {
                            ImportUtils.CreateSlcfLayer(layer.id.ToString());
                        }
                    }

                    if (data.devcs != null && data.devcs.ToString() != "")
                    {
                        foreach(dynamic layer in devcs)
                        {
                            ImportUtils.CreateDevcLayer(layer.id.ToString());
                        }
                    }

                    if (data.jetfans != null && data.jetfans.ToString() != "")
                    {
                        foreach(dynamic layer in jetfans)
                        {
                            ImportUtils.CreateJetfanLayer(layer.id.ToString());
                        }
                    }

                    Utils.Utils.End();
                    return true;
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }
        public static acWebSocketMessage GetCadElementsWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                ExportFds exportFds = new ExportFds();
                Object cadGeometry = exportFds.DataFDS();
                acWebSocketMessage message = new acWebSocketMessage("success", "getCadGeometryWeb", cadGeometry, null);
                return message;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                acWebSocketMessage message = new acWebSocketMessage("error", "getCadGeometryWeb", null, null);
                return message;
            }
        }

        // Obst
        public static isCreatedObject CreateObstWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                if (data.idAC == null || data.idAC == "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();

                        string layer = "!FDS_OBST[inert](0)";
                        if (data.surf.surf_id != null)
                            if(data.surf.surf_id.ToString() != "")
                                layer = ImportUtils.CreateObstLayer(data.surf.surf_id.ToString(), data.elevation.ToString());

                        dynamic obst = new System.Dynamic.ExpandoObject();
                        Point3d p1 = new Point3d(Convert.ToDouble(data.xb.x1), Convert.ToDouble(data.xb.y1), Convert.ToDouble(data.xb.z1));
                        Point3d p2 = new Point3d(Convert.ToDouble(data.xb.x2), Convert.ToDouble(data.xb.y2), Convert.ToDouble(data.xb.z2));

                        // CreateBox zwraca handle i wysylam jako acID w data powrotnym ...
                        ObjectId acObjId = Utils.Utils.CreateBox(p1, p2, layer, true);

                        // Start a transaction
                        using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                        {
                            // Open the selected object for write
                            Entity acEnt = acTrans.GetObject(acObjId, OpenMode.ForRead) as Entity;
                            string subStr = acEnt.Layer.Substring(10);
                            int beg = subStr.IndexOf("(");
                            int end = subStr.IndexOf(")");

                            //obst.id = acEnt.ObjectId.GetHashCode().ToString().PadRight(4);
                            obst.idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16);
                            obst.xb = new
                            {
                                x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                                x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                                y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                                y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                                z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                                z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                            };
                            obst.surf = new
                            {
                                type = "surf_id",
                                surf_id = subStr.Substring(0, beg)
                            };
                            obst.elevation = float.Parse(subStr.Substring(beg + 1, end - (beg + 1)));
                        }
                        Utils.Utils.End();
                        isCreated.isCreated = true;
                        isCreated.acObj = obst;
                        return isCreated;
                    }
                }
                return isCreated;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }
        public static bool DeleteObstWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if(data.idAC != null && data.idAC.ToString() != "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        long ln = Convert.ToInt64(data.idAC.ToString());
                        Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                        ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                        Utils.Utils.DeleteObject(idAC);
                        Utils.Utils.End();
                    }
                    return true;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }
        /*public static bool UpdateObstWeb(dynamic data)
        {
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if(data.idAC != null)
                {
                    if (data.idAC.ToString() != "")
                    {
                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            Utils.Utils.Init();
                            long ln = Convert.ToInt64(data.idAC.ToString());
                            Handle hn = Utils.Utils.GetHandleFromIdAC(ln);
                            ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                            Utils.Utils.UpdateSolid3D(idAC, data.xb);
                            Utils.Utils.End();
                        }
                        return true;
                    }
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }
        */
        public static isCreatedObject UpdateObstWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            string layerName = "!FDS_OBST[inert](0)";

            try
            {
                if(data.idAC != null)
                {
                    if (data.idAC.ToString() != "")
                    {
                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            if(data.surf.surf_id != null)
                                layerName = ImportUtils.CreateObstLayer(data.surf.surf_id.ToString(), data.elevation.ToString());

                            Utils.Utils.Init();
                            long ln = Convert.ToInt64(data.idAC.ToString());
                            Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                            ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                            ImportUtils.UpdateSolid3D(idAC, data.xb);

                            if(data.surf.surf_id != null)
                                ImportUtils.UpdateObjectLayer(idAC, layerName);

                            dynamic obst = new System.Dynamic.ExpandoObject();
                            obst.idAC = data.idAC;
                            obst.xb = data.xb;
                            isCreated.isCreated = true;
                            isCreated.acObj = obst;

                            Utils.Utils.End();
                        }
                    }
                    return isCreated;
                }
                return isCreated;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }

        // Hole
        public static isCreatedObject CreateHoleWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                if (data.idAC == null || data.idAC == "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        string layer = "!FDS_HOLE(0)";
                        // TODO: poprawić poniewaz w hole nie ma warstw
                        //if (data.surf.surf_id != null)
                        //    layer = ImportUtils.CreateObstLayer(data.surf.surf_id.ToString(), data.elevation.ToString());

                        dynamic obst = new System.Dynamic.ExpandoObject();
                        Point3d p1 = new Point3d(Convert.ToDouble(data.xb.x1), Convert.ToDouble(data.xb.y1), Convert.ToDouble(data.xb.z1));
                        Point3d p2 = new Point3d(Convert.ToDouble(data.xb.x2), Convert.ToDouble(data.xb.y2), Convert.ToDouble(data.xb.z2));

                        // CreateBox zwraca handle i wysylam jako acID w data powrotnym ...
                        ObjectId acObjId = Utils.Utils.CreateBox(p1, p2, layer, true);

                        // Start a transaction
                        using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                        {
                            // Open the selected object for write
                            Entity acEnt = acTrans.GetObject(acObjId, OpenMode.ForRead) as Entity;
                            string subStr = acEnt.Layer.Substring(10);
                            int beg = subStr.IndexOf("(");
                            int end = subStr.IndexOf(")");

                            obst.id = acEnt.ObjectId.GetHashCode().ToString().PadRight(4);
                            obst.idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16);
                            obst.xb = new
                            {
                                x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                                x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                                y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                                y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                                z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                                z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                            };
                            obst.surf = new
                            {
                                type = "surf_id",
                                surf_id = subStr.Substring(0, beg)
                            };
                            obst.elevation = float.Parse(subStr.Substring(beg + 1, end - (beg + 1)));
                        }
                        Utils.Utils.End();
                        isCreated.isCreated = true;
                        isCreated.acObj = obst;
                        return isCreated;
                    }
                }
                return isCreated;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }
        public static bool DeleteHoleWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if(data.idAC != null && data.idAC.ToString() != "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        long ln = Convert.ToInt64(data.idAC.ToString());
                        Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                        ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                        Utils.Utils.DeleteObject(idAC);
                        Utils.Utils.End();
                    }
                    return true;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }
        public static bool UpdateHoleWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if (data.idAC != null)
                {
                    if (data.idAC.ToString() != "")
                    {

                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            Utils.Utils.Init();
                            long ln = Convert.ToInt64(data.idAC.ToString());
                            Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                            ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                            ImportUtils.UpdateSolid3D(idAC, data.xb);
                            Utils.Utils.End();
                        }
                        return true;
                    }
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }

        // Mesh
        public static isCreatedObject CreateMeshWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                if (data.idAC == null || data.idAC == "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        string layer = "!FDS_MESH";

                        dynamic mesh = new System.Dynamic.ExpandoObject();
                        Point3d p1 = new Point3d(Convert.ToDouble(data.xb.x1), Convert.ToDouble(data.xb.y1), Convert.ToDouble(data.xb.z1));
                        Point3d p2 = new Point3d(Convert.ToDouble(data.xb.x2), Convert.ToDouble(data.xb.y2), Convert.ToDouble(data.xb.z2));

                        // CreateBox zwraca handle i wysylam jako acID w data powrotnym ...
                        ObjectId acObjId = Utils.Utils.CreateBox(p1, p2, layer, true);

                        // Start a transaction
                        using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                        {
                            // Open the selected object for write
                            Entity acEnt = acTrans.GetObject(acObjId, OpenMode.ForRead) as Entity;

                            //mesh.id = acEnt.ObjectId.GetHashCode().ToString().PadRight(4);
                            mesh.idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16);
                            mesh.xb = new
                            {
                                x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                                x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                                y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                                y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                                z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                                z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                            };
                        }
                        Utils.Utils.End();
                        isCreated.isCreated = true;
                        isCreated.acObj = mesh;
                        return isCreated;
                    }
                }
                return isCreated;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }
        public static bool DeleteMeshWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if(data.idAC != null && data.idAC.ToString() != "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        long ln = Convert.ToInt64(data.idAC.ToString());
                        Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                        ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                        Utils.Utils.DeleteObject(idAC);
                        Utils.Utils.End();
                    }
                    return true;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }
        public static bool UpdateMeshWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if (data.idAC != null)
                {
                    if (data.idAC.ToString() != "")
                    {

                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            Utils.Utils.Init();
                            long ln = Convert.ToInt64(data.idAC.ToString());
                            Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                            ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                            ImportUtils.UpdateSolid3D(idAC, data.xb);
                            Utils.Utils.End();
                        }
                        return true;
                    }
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }

        // Open - the same way as simple vent

        //Simple Vent
        public static isCreatedObject CreateVentWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                if (data.idAC == null || data.idAC != "")
                {
                    if (data.idAC == "")
                    {
                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            Utils.Utils.Init();
                            string layer = "!FDS_VENT[]";
                            if (data.surf_id != null && data.surf_id != "")
                                layer = ImportUtils.CreateVentLayer(data.surf_id.ToString());

                            dynamic vent = new System.Dynamic.ExpandoObject();
                            Point3d p1 = new Point3d(Convert.ToDouble(data.xb.x1), Convert.ToDouble(data.xb.y1), Convert.ToDouble(data.xb.z1));
                            Point3d p2 = new Point3d(Convert.ToDouble(data.xb.x2), Convert.ToDouble(data.xb.y2), Convert.ToDouble(data.xb.z2));

                            // CreateBox zwraca handle i wysylam jako acID w data powrotnym ...
                            ObjectId acObjId = Utils.Utils.CreateExtrudedSurface(p1, p2, layer);

                            // Start a transaction
                            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                            {
                                // Open the selected object for write
                                Entity acEnt = acTrans.GetObject(acObjId, OpenMode.ForRead) as Entity;

                                //mesh.id = acEnt.ObjectId.GetHashCode().ToString().PadRight(4);
                                vent.idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16);
                                vent.xb = new
                                {
                                    x1 = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4),
                                    x2 = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4),
                                    y1 = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4),
                                    y2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4),
                                    z1 = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4),
                                    z2 = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4),
                                };
                            }
                            Utils.Utils.End();
                            isCreated.isCreated = true;
                            isCreated.acObj = vent;
                            return isCreated;
                        }
                    }
                }
                return isCreated;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }
        public static bool DeleteVentWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if(data.idAC != null && data.idAC.ToString() != "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        long ln = Convert.ToInt64(data.idAC.ToString());
                        Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                        ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                        Utils.Utils.DeleteObject(idAC);
                        Utils.Utils.End();
                    }
                    return true;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }
        public static bool UpdateVentWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if (data.idAC != null)
                {
                    if (data.idAC.ToString() != "")
                    {
                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            Utils.Utils.Init();
                            long ln = Convert.ToInt64(data.idAC.ToString());
                            Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                            ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                            ImportUtils.UpdateSurface(idAC, data.xb);
                            Utils.Utils.End();
                        }
                        return true;
                    }
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }

        // Slcf - change color in other objects while creating 
        public static isCreatedObject CreateSlcfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                if (data.idAC == null || data.idAC == "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        string layer = "!FDS_SLCF[]";
                        if(data.id != null && data.id != "")
                        {
                            layer = "!FDS_SLCF[" + data.id.ToString() + "]";
                            // Check if color is sent from Web
                            if(data.color != null && data.color.rgb.Count > 0)
                            {
                                Utils.Layers.CreateLayer("!FDS_SLCF[" + data.id.ToString() + "]", Color.FromRgb((byte)data.color.rgb[0], (byte)data.color.rgb[1], (byte)data.color.rgb[2]));
                            }
                            else
                            {
                                Utils.Layers.CreateLayer("!FDS_SLCF[" + data.id.ToString() + "]");
                            }
                        }

                        Extents3d ext = Utils.Utils.GetAllElementsBoundingBox();

                        if (ext.MinPoint == ext.MaxPoint)
                            ext.Set(new Point3d(0, 0, 0), new Point3d(10, 10, 3));

                        Point3d p1 = new Point3d();
                        Point3d p2 = new Point3d();

                        if(data.direction.ToString() == "x")
                        {
                            p1 = new Point3d(Convert.ToDouble(data.value), ext.MinPoint.Y, ext.MinPoint.Z);
                            p2 = new Point3d(Convert.ToDouble(data.value), ext.MaxPoint.Y, ext.MaxPoint.Z);
                        }
                        else if(data.direction.ToString() == "y")
                        {
                            p1 = new Point3d(ext.MinPoint.X, Convert.ToDouble(data.value), ext.MinPoint.Z);
                            p2 = new Point3d(ext.MaxPoint.X, Convert.ToDouble(data.value), ext.MaxPoint.Z);
                        }
                        else if(data.direction.ToString() == "z")
                        {
                            p1 = new Point3d(ext.MinPoint.X, ext.MinPoint.Y, Convert.ToDouble(data.value));
                            p2 = new Point3d(ext.MaxPoint.X, ext.MaxPoint.Y, Convert.ToDouble(data.value));
                        }

                        // CreateBox zwraca handle i wysylam jako acID w data powrotnym ...
                        ObjectId acObjId = Utils.Utils.CreateExtrudedSurface(p1, p2, layer);

                        dynamic slcf = new System.Dynamic.ExpandoObject();

                        // Start a transaction
                        using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                        {
                            // Open the selected object for write
                            Entity acEnt = acTrans.GetObject(acObjId, OpenMode.ForRead) as Entity;

                            //mesh.id = acEnt.ObjectId.GetHashCode().ToString().PadRight(4);
                            slcf.idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16);
                        }
                        Utils.Utils.End();
                        isCreated.isCreated = true;
                        isCreated.acObj = slcf;
                        return isCreated;
                    }
                }
                return isCreated;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }
        public static bool DeleteSlcfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if(data.idAC != null && data.idAC.ToString() != "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        long ln = Convert.ToInt64(data.idAC.ToString());
                        Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                        ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                        Utils.Utils.DeleteObject(idAC);
                        Utils.Utils.End();
                    }
                    return true;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }
        public static bool UpdateSlcfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if (data.idAC != null)
                {
                    if (data.idAC.ToString() != "")
                    {

                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            Utils.Utils.Init();
                            long ln = Convert.ToInt64(data.idAC.ToString());
                            Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                            ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);

                            dynamic xb = new System.Dynamic.ExpandoObject();
                            Extents3d ext = Utils.Utils.GetAllElementsBoundingBox();

                            if (ext.MaxPoint == ext.MaxPoint)
                                xb = new
                                {
                                    x1 = 0,
                                    x2 = 10,
                                    y1 = 0,
                                    y2 = 10,
                                    z1 = 0,
                                    z2 = 3
                                };


                            if (data.direction.ToString() == "x")
                            {
                                xb = new
                                {
                                    x1 = Convert.ToDouble(data.value),
                                    x2 = Convert.ToDouble(data.value),
                                    y1 = ext.MinPoint.Y,
                                    y2 = ext.MaxPoint.Y,
                                    z1 = ext.MinPoint.Z,
                                    z2 = ext.MaxPoint.Z
                                };
                            }
                            else if (data.direction.ToString() == "y")
                            {
                                xb = new
                                {
                                    x1 = ext.MinPoint.X,
                                    x2 = ext.MaxPoint.X,
                                    y1 = Convert.ToDouble(data.value),
                                    y2 = Convert.ToDouble(data.value),
                                    z1 = ext.MinPoint.Z,
                                    z2 = ext.MaxPoint.Z
                                };
                            }
                            else if (data.direction.ToString() == "z")
                            {
                                xb = new
                                {
                                    x1 = ext.MinPoint.X,
                                    x2 = ext.MaxPoint.X,
                                    y1 = ext.MinPoint.Y,
                                    y2 = ext.MaxPoint.Y,
                                    z1 = Convert.ToDouble(data.value),
                                    z2 = Convert.ToDouble(data.value)
                                };
                            }

                            ImportUtils.UpdateSurface(idAC, data.xb);
                            Utils.Utils.End();
                        }
                        return true;
                    }
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }

        // Devc
        public static isCreatedObject CreateDevcWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                if (data.idAC == null || data.idAC == "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        string layer = "!FDS_DEVC[]";
                        if(data.id != null && data.id != "")
                            layer = ImportUtils.CreateSlcfLayer(data.id.ToString());

                        Point3d p1 = Point3d.Origin;
                        Point3d p2 = Point3d.Origin;
                        ObjectId acObjId = ObjectId.Null;

                        if(data.geometrical_type.ToString() == "point")
                        {
                            p1 = new Point3d(Convert.ToDouble(data.xyz.x), Convert.ToDouble(data.xyz.y), Convert.ToDouble(data.xyz.z));
                            acObjId = Utils.Utils.CreateSphere(p1, 0.1, true);
                        }
                        else if(data.geometrical_type.ToString() == "plane")
                        {
                            p1 = new Point3d(Convert.ToDouble(data.xb.x1), Convert.ToDouble(data.xb.y1), Convert.ToDouble(data.xb.z1));
                            p2 = new Point3d(Convert.ToDouble(data.xb.x2), Convert.ToDouble(data.xb.y2), Convert.ToDouble(data.xb.z2));
                            acObjId = Utils.Utils.CreateExtrudedSurface(p1, p2, layer);
                        }
                        else if(data.geometrical_type.ToString() == "volume")
                        {
                            p1 = new Point3d(Convert.ToDouble(data.xb.x1), Convert.ToDouble(data.xb.y1), Convert.ToDouble(data.xb.z1));
                            p2 = new Point3d(Convert.ToDouble(data.xb.x2), Convert.ToDouble(data.xb.y2), Convert.ToDouble(data.xb.z2));
                            acObjId = Utils.Utils.CreateBox(p1, p2, layer, true);
                        }

                        dynamic devc = new System.Dynamic.ExpandoObject();

                        // Start a transaction
                        using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                        {
                            // Open the selected object for write
                            Entity acEnt = acTrans.GetObject(acObjId, OpenMode.ForRead) as Entity;

                            //mesh.id = acEnt.ObjectId.GetHashCode().ToString().PadRight(4);
                            devc.idAC = Convert.ToInt64(acEnt.Handle.ToString(), 16);
                        }
                        Utils.Utils.End();
                        isCreated.isCreated = true;
                        isCreated.acObj = devc;
                        return isCreated;
                    }
                }
                return isCreated;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }
        public static bool DeleteDevcWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if(data.idAC != null && data.idAC.ToString() != "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        long ln = Convert.ToInt64(data.idAC.ToString());
                        Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                        ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                        Utils.Utils.DeleteObject(idAC);
                        Utils.Utils.End();
                    }
                    return true;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }
        public static bool UpdateDevcWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if (data.idAC != null)
                {
                    if (data.idAC != "")
                    {
                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            Utils.Utils.Init();
                            long ln = Convert.ToInt64(data.idAC.ToString());
                            Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                            ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);

                            dynamic xb = new System.Dynamic.ExpandoObject();
                            Extents3d ext = Utils.Utils.GetAllElementsBoundingBox();

                            if (ext.MaxPoint == ext.MaxPoint)
                                xb = new
                                {
                                    x1 = 0,
                                    x2 = 10,
                                    y1 = 0,
                                    y2 = 10,
                                    z1 = 0,
                                    z2 = 3
                                };


                            if (data.direction.ToString() == "x")
                            {
                                xb = new
                                {
                                    x1 = Convert.ToDouble(data.value),
                                    x2 = Convert.ToDouble(data.value),
                                    y1 = ext.MinPoint.Y,
                                    y2 = ext.MaxPoint.Y,
                                    z1 = ext.MinPoint.Z,
                                    z2 = ext.MaxPoint.Z
                                };
                            }
                            else if (data.direction.ToString() == "y")
                            {
                                xb = new
                                {
                                    x1 = ext.MinPoint.X,
                                    x2 = ext.MaxPoint.X,
                                    y1 = Convert.ToDouble(data.value),
                                    y2 = Convert.ToDouble(data.value),
                                    z1 = ext.MinPoint.Z,
                                    z2 = ext.MaxPoint.Z
                                };
                            }
                            else if (data.direction.ToString() == "z")
                            {
                                xb = new
                                {
                                    x1 = ext.MinPoint.X,
                                    x2 = ext.MaxPoint.X,
                                    y1 = ext.MinPoint.Y,
                                    y2 = ext.MaxPoint.Y,
                                    z1 = Convert.ToDouble(data.value),
                                    z2 = Convert.ToDouble(data.value)
                                };
                            }

                            ImportUtils.UpdateSurface(idAC, data.xb);
                            Utils.Utils.End();
                        }
                        return true;
                    }
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }

        // Obst surf
        public static isCreatedObject CreateObstSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                using (DocumentLock docLock = acDoc.LockDocument())
                {
                    Utils.Utils.Init();
                    if (data.id == null || data.id.ToString() == "")
                        return isCreated;

                    // Check if color is sent from Web
                    ObjectId acObjId = (data.color != null && data.color.rgb.Count > 0) ?
                        Utils.Layers.CreateLayer("!FDS_OBST[" + data.id.ToString() + "](0)", Color.FromRgb((byte)data.color.rgb[0], (byte)data.color.rgb[1], (byte)data.color.rgb[2]), true) :
                        Utils.Layers.CreateLayer("!FDS_OBST[" + data.id.ToString() + "](0)", true);

                    dynamic surf = new System.Dynamic.ExpandoObject();
                    // Start a transaction
                    using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                    {
                        LayerTableRecord acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;
                        surf.idAC = Convert.ToInt64(acLyrTblRec.Handle.ToString(), 16);

                        isCreated.acObj = surf;
                        isCreated.isCreated = true;
                    }

                    Utils.Utils.End();
                    return isCreated;
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }
        public static bool UpdateObstSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            try
            {
                if (data.idAC != null)
                {
                    if (data.idAC.ToString() != "")
                    {
                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            long ln = Convert.ToInt64(data.idAC.ToString());
                            Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                            ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);

                            if (data.id != null && data.id.ToString() != "")
                            {
                                string layerName = ImportUtils.UpdateObstLayer(idAC, data.id.ToString());
                                return true;
                            }
                        }
                    }
                    return false;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }
        public static bool DeleteObstSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if(data.idAC != null && data.idAC.ToString() != "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        long ln = Convert.ToInt64(data.idAC.ToString());
                        Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                        ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                        ImportUtils.DeleteObstLayer(idAC);
                        Utils.Utils.End();
                    }
                    return true;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }

        // Vent surf 
        public static isCreatedObject CreateVentSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                using (DocumentLock docLock = acDoc.LockDocument())
                {
                    Utils.Utils.Init();
                    if (data.id == null || data.id.ToString() == "")
                        return isCreated;

                    // Check if color is sent from Web
                    ObjectId acObjId = (data.color != null && data.color.rgb.Count > 0) ?
                        Utils.Layers.CreateLayer("!FDS_VENT[" + data.id.ToString() + "]", Color.FromRgb((byte)data.color.rgb[0], (byte)data.color.rgb[1], (byte)data.color.rgb[2]), true) :
                        Utils.Layers.CreateLayer("!FDS_VENT[" + data.id.ToString() + "]", true);

                    dynamic surf = new System.Dynamic.ExpandoObject();
                    // Start a transaction
                    using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                    {
                        LayerTableRecord acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;
                        surf.idAC = Convert.ToInt64(acLyrTblRec.Handle.ToString(), 16);

                        isCreated.acObj = surf;
                        isCreated.isCreated = true;
                    }

                    Utils.Utils.End();
                    return isCreated;
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }
        public static bool UpdateVentSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            try
            {
                if (data.idAC != null)
                {
                    if (data.idAC.ToString() != "")
                    {
                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            long ln = Convert.ToInt64(data.idAC.ToString());
                            Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                            ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);

                            if (data.id != null && data.id.ToString() != "")
                            {
                                string layerName = ImportUtils.UpdateVentLayer(idAC, data.id.ToString());
                                return true;
                            }
                            return true;
                        }
                    }
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
            return false;
        }
        public static bool DeleteVentSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if(data.idAC != null && data.idAC.ToString() != "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        long ln = Convert.ToInt64(data.idAC.ToString());
                        Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                        ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                        ImportUtils.DeleteLayer(idAC);
                        Utils.Utils.End();
                    }
                    return true;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }

        // Spec surf 
        public static isCreatedObject CreateSpecSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                using (DocumentLock docLock = acDoc.LockDocument())
                {
                    Utils.Utils.Init();
                    if (data.id == null || data.id.ToString() == "")
                        return isCreated;

                    // Check if color is sent from Web
                    ObjectId acObjId = (data.color != null && data.color.rgb.Count > 0) ?
                        Utils.Layers.CreateLayer("!FDS_SPEC[" + data.id.ToString() + "]", Color.FromRgb((byte)data.color.rgb[0], (byte)data.color.rgb[1], (byte)data.color.rgb[2]), true) :
                        Utils.Layers.CreateLayer("!FDS_SPEC[" + data.id.ToString() + "]", true);

                    dynamic surf = new System.Dynamic.ExpandoObject();
                    // Start a transaction
                    using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                    {
                        LayerTableRecord acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;
                        surf.idAC = Convert.ToInt64(acLyrTblRec.Handle.ToString(), 16);

                        isCreated.acObj = surf;
                        isCreated.isCreated = true;
                    }

                    Utils.Utils.End();
                    return isCreated;
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }
        public static bool UpdateSpecSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            try
            {
                if (data.idAC != null)
                {
                    if (data.idAC.ToString() != "")
                    {
                        using (DocumentLock docLock = acDoc.LockDocument())
                        {
                            long ln = Convert.ToInt64(data.idAC.ToString());
                            Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                            ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);

                            if (data.id != null && data.id.ToString() != "")
                            {
                                string layerName = ImportUtils.UpdateSpecLayer(idAC, data.id.ToString());
                                return true;
                            }
                            return true;
                        }
                    }
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
            return false;
        }
        public static bool DeleteSpecSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if(data.idAC != null && data.idAC.ToString() != "")
                {
                    using (DocumentLock docLock = acDoc.LockDocument())
                    {
                        Utils.Utils.Init();
                        long ln = Convert.ToInt64(data.idAC.ToString());
                        Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                        ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                        ImportUtils.DeleteLayer(idAC);
                        Utils.Utils.End();
                    }
                    return true;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }

        // Jetfan surf
        public static isCreatedObject CreateJetfanSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                using (DocumentLock docLock = acDoc.LockDocument())
                {
                    Utils.Utils.Init();
                    if (data.id == null || data.id.ToString() == "")
                        return isCreated;

                    // Check if color is sent from Web
                    ObjectId acObjId = (data.color != null && data.color.rgb.Count > 0) ?
                        Utils.Layers.CreateLayer("!FDS_JFAN[" + data.id.ToString() + "]", Color.FromRgb((byte)data.color.rgb[0], (byte)data.color.rgb[1], (byte)data.color.rgb[2]), true) :
                        Utils.Layers.CreateLayer("!FDS_JFAN[" + data.id.ToString() + "]", true);

                    dynamic surf = new System.Dynamic.ExpandoObject();
                    // Start a transaction
                    using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                    {
                        LayerTableRecord acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;
                        surf.idAC = Convert.ToInt64(acLyrTblRec.Handle.ToString(), 16);

                        isCreated.acObj = surf;
                        isCreated.isCreated = true;
                    }

                    Utils.Utils.End();
                    return isCreated;
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }

        // Slcf surf
        public static isCreatedObject CreateSlcfSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                using (DocumentLock docLock = acDoc.LockDocument())
                {
                    Utils.Utils.Init();
                    if (data.id == null || data.id.ToString() == "")
                        return isCreated;

                    // Check if color is sent from Web
                    ObjectId acObjId = (data.color != null && data.color.rgb.Count > 0) ?
                        Utils.Layers.CreateLayer("!FDS_SLCF[" + data.id.ToString() + "]", Color.FromRgb((byte)data.color.rgb[0], (byte)data.color.rgb[1], (byte)data.color.rgb[2]), true) :
                        Utils.Layers.CreateLayer("!FDS_SLCF[" + data.id.ToString() + "]", true);

                    dynamic surf = new System.Dynamic.ExpandoObject();
                    // Start a transaction
                    using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                    {
                        LayerTableRecord acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;
                        surf.idAC = Convert.ToInt64(acLyrTblRec.Handle.ToString(), 16);

                        isCreated.acObj = surf;
                        isCreated.isCreated = true;
                    }

                    Utils.Utils.End();
                    return isCreated;
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }

        // Devc surf
        public static isCreatedObject CreateDevcSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                using (DocumentLock docLock = acDoc.LockDocument())
                {
                    Utils.Utils.Init();
                    if (data.id == null || data.id.ToString() == "")
                        return isCreated;

                    // Check if color is sent from Web
                    ObjectId acObjId = (data.color != null && data.color.rgb.Count > 0) ?
                        Utils.Layers.CreateLayer("!FDS_DEVC[" + data.id.ToString() + "]", Color.FromRgb((byte)data.color.rgb[0], (byte)data.color.rgb[1], (byte)data.color.rgb[2]), true) :
                        Utils.Layers.CreateLayer("!FDS_DEVC[" + data.id.ToString() + "]", true);

                    dynamic surf = new System.Dynamic.ExpandoObject();
                    // Start a transaction
                    using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                    {
                        LayerTableRecord acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;
                        surf.idAC = Convert.ToInt64(acLyrTblRec.Handle.ToString(), 16);

                        isCreated.acObj = surf;
                        isCreated.isCreated = true;
                    }

                    Utils.Utils.End();
                    return isCreated;
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }

        // Fire surf
        public static isCreatedObject CreateFireSurfWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            isCreatedObject isCreated;
            isCreated.isCreated = false;
            isCreated.acObj = null;

            try
            {
                using (DocumentLock docLock = acDoc.LockDocument())
                {
                    Utils.Utils.Init();
                    if (data.id == null || data.id.ToString() == "")
                        return isCreated;

                    // Check if color is sent from Web
                    ObjectId acObjId = (data.color != null && data.color.rgb.Count > 0) ?
                        Utils.Layers.CreateLayer("!FDS_FIRE[" + data.id.ToString() + "]", Color.FromRgb((byte)data.color.rgb[0], (byte)data.color.rgb[1], (byte)data.color.rgb[2]), true) :
                        Utils.Layers.CreateLayer("!FDS_FIRE[" + data.id.ToString() + "]", true);

                    dynamic surf = new System.Dynamic.ExpandoObject();
                    // Start a transaction
                    using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                    {
                        LayerTableRecord acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;
                        surf.idAC = Convert.ToInt64(acLyrTblRec.Handle.ToString(), 16);

                        isCreated.acObj = surf;
                        isCreated.isCreated = true;
                    }

                    Utils.Utils.End();
                    return isCreated;
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return isCreated;
            }
        }

        // SelectObject
        public static bool SelectObjectWeb(dynamic data)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            try
            {
                if (data.idAC != null && data.idAC.ToString() != "")
                {
                    long ln = Convert.ToInt64(data.idAC.ToString());
                    Handle hn = ImportUtils.GetHandleFromIdAC(ln);
                    ObjectId idAC = acCurDb.GetObjectId(false, hn, 0);
                    ImportUtils.SelectObject(idAC);
                    return true;
                }
                return false;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return false;
            }
        }

    }
}
