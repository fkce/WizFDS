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
using Autodesk.AutoCAD.Runtime;
#endif

using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace WizFDS.Utils
{
    public class Layers
    {
        static double levelOld = 0.0;

        public static int currentFloor = 0;

        public static void SetLayer(string layer)
        {
            acApp.SetSystemVariable("CLAYER", layer);
        }
        public static void SetLayerType(string layer)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = Application.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            string layerName = "0";

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // This example returns the layer table for the current database
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                             OpenMode.ForRead) as LayerTable;

                // Step through the Layer table and print each layer name
                foreach (ObjectId acObjId in acLyrTbl)
                {
                    LayerTableRecord acLyrTblRec;
                    acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForRead) as LayerTableRecord;

                    if (acLyrTblRec.Name.Contains(layer))
                    {
                        layerName = acLyrTblRec.Name;
                        goto End;
                    }
                }
            }
            End:;
            acApp.SetSystemVariable("CLAYER", layerName);
            return;
        }
        public static void SetLayerForCurrentFloor(string layer)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            // Get current floor from current layer name
            Regex regEx = new Regex(@"\((.+)\)", RegexOptions.IgnoreCase);
            Match match = regEx.Match(CurrentLayer());
            if (match.Success)
            {
                System.Text.RegularExpressions.Group group = match.Groups[1];
                Int32.TryParse(group.ToString(), out currentFloor);
                try
                {
                    SetLayer(layer + "(" + currentFloor + ")");
                    return;
                }
                catch (System.Exception e)
                {
                    SetLayer(layer + "(0)");
                    ed.WriteMessage("\nProgram exception: " + e.ToString());
                    return;
                }
            }
            else
            {
                try
                {
                    SetLayer(layer + "(0)");
                }
                catch (System.Exception)
                {
                    SetLayer("0");
                    ed.WriteMessage("\nWarrning! Layer set to 0. There is no layer " + layer);
                    return;
                }
            }
            return;
        }

        public static string CurrentLayer()
        {
            return acApp.GetSystemVariable("CLAYER").ToString();
        }
        public static void CreateBasicLayers()
        {
            if (Utils.layersCreated == false)
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

                    Dictionary<string, short> layers = new Dictionary<string, short>();
                    layers.Add("!FDS_MESH", 2);
                    layers.Add("!FDS_MESH[open]", 3);
                    layers.Add("!FDS_SLCF[slice]", 242);
                    layers.Add("!FDS_DEVC[device]", 7);
                    layers.Add("!FDS_FIRE[fire]", 1);
                    layers.Add("!FDS_HIDDEN", 7);
                    layers.Add("!FDS_VENT[vent]", 6);
                    layers.Add("!FDS_JETF[jetfan]", 54);
                    layers.Add("!FDS_OBST[inert](0)", 123);
                    layers.Add("!FDS_HOLE(0)", 140);
                    layers.Add("!FDS_SPEC[specie]", 201);

                    foreach (KeyValuePair<string, short> layer in layers)
                    {

                        if (acLyrTbl.Has(layer.Key) == false)
                        {
                            LayerTableRecord acLyrTblRec = new LayerTableRecord();

                            // Assign the layer the ACI color 1 and a name
                            acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                            acLyrTblRec.Name = layer.Key;

                            // Upgrade the Layer table for write
                            acLyrTbl.UpgradeOpen();

                            // Append the new layer to the Layer table and the transaction
                            acLyrTbl.Add(acLyrTblRec);
                            acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                        }
                    }
                    acTrans.Commit();
                    Utils.layersCreated = true;
                }
                return;
            }
            return;
        }
        public static void CreateBasicLayers(bool force)
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

                Dictionary<string, short> layers = new Dictionary<string, short>();
                    layers.Add("!FDS_MESH", 2);
                    layers.Add("!FDS_MESH[open]", 3);
                    layers.Add("!FDS_SLCF[slice]", 242);
                    layers.Add("!FDS_DEVC[device]", 7);
                    layers.Add("!FDS_FIRE[fire]", 1);
                    layers.Add("!FDS_HIDDEN", 7);
                    layers.Add("!FDS_VENT[vent]", 6);
                    layers.Add("!FDS_JETF[jetfan]", 54);
                    layers.Add("!FDS_OBST[inert](0)", 123);
                    layers.Add("!FDS_HOLE(0)", 140);
                    layers.Add("!FDS_SPEC[specie]", 201);

                foreach (KeyValuePair<string, short> layer in layers)
                {

                    if (acLyrTbl.Has(layer.Key) == false)
                    {
                        LayerTableRecord acLyrTblRec = new LayerTableRecord();

                        // Assign the layer the ACI color 1 and a name
                        acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                        acLyrTblRec.Name = layer.Key;

                        // Upgrade the Layer table for write
                        acLyrTbl.UpgradeOpen();

                        // Append the new layer to the Layer table and the transaction
                        acLyrTbl.Add(acLyrTblRec);
                        acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                    }
                }
                acTrans.Commit();
                Utils.layersCreated = true;
            }
            return;
        }

        public static void CreateNeededLayers()
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

                Dictionary<string, short> layers = new Dictionary<string, short>();
                layers.Add("!FDS_MESH", 2);
                layers.Add("!FDS_MESH[open]", 3);
                layers.Add("!FDS_HIDDEN", 7);
                layers.Add("!FDS_HOLE(0)", 140);

                foreach (KeyValuePair<string, short> layer in layers)
                {
                    if (acLyrTbl.Has(layer.Key) == false)
                    {
                        LayerTableRecord acLyrTblRec = new LayerTableRecord();

                        // Assign the layer the ACI color 1 and a name
                        acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                        acLyrTblRec.Name = layer.Key;

                        // Upgrade the Layer table for write
                        acLyrTbl.UpgradeOpen();

                        // Append the new layer to the Layer table and the transaction
                        acLyrTbl.Add(acLyrTblRec);
                        acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                    }
                }
                acTrans.Commit();
            }
            return;
        }

        public static void CreateFloorLayers(int begin, int end)
        {

        }
        public static void CreateLayer(string layer)
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

                if (acLyrTbl.Has(layer) == false)
                {
                    LayerTableRecord acLyrTblRec = new LayerTableRecord();

                    // Assign the layer the ACI color 1 and a name
                    //acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                    acLyrTblRec.Name = layer;

                    // Upgrade the Layer table for write
                    acLyrTbl.UpgradeOpen();

                    // Append the new layer to the Layer table and the transaction
                    acLyrTbl.Add(acLyrTblRec);
                    acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                }
                acTrans.Commit();
            }
            return;
        }
        public static void CreateLayer(string layer, Color color)
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

                if (acLyrTbl.Has(layer) == false)
                {
                    LayerTableRecord acLyrTblRec = new LayerTableRecord();

                    // Assign the layer the ACI color 1 and a name
                    //acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                    acLyrTblRec.Name = layer;
                    acLyrTblRec.Color = color;

                    // Upgrade the Layer table for write
                    acLyrTbl.UpgradeOpen();

                    // Append the new layer to the Layer table and the transaction
                    acLyrTbl.Add(acLyrTblRec);
                    acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                }
                acTrans.Commit();
            }
            return;
        }

        public static ObjectId CreateLayer(string layer, bool returnId)
        {
            // Get the current document and database
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            ObjectId id = ObjectId.Null;

            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;

                if (acLyrTbl.Has(layer) == false)
                {
                    LayerTableRecord acLyrTblRec = new LayerTableRecord();

                    // Assign the layer the ACI color 1 and a name
                    //acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                    acLyrTblRec.Name = layer;

                    // Upgrade the Layer table for write
                    acLyrTbl.UpgradeOpen();

                    // Append the new layer to the Layer table and the transaction
                    acLyrTbl.Add(acLyrTblRec);
                    acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                    acTrans.Commit();
                    id = acLyrTblRec.ObjectId;
                }
                else
                {
                    id = acLyrTbl[layer];
                }
            }
            return id;
        }
        public static ObjectId CreateLayer(string layer, Color color, bool returnId)
        {
            // Get the current document and database
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            ObjectId id = ObjectId.Null;

            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Layer table for read
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;

                if (acLyrTbl.Has(layer) == false)
                {
                    LayerTableRecord acLyrTblRec = new LayerTableRecord();

                    // Assign the layer the ACI color 1 and a name
                    acLyrTblRec.Color = color;
                    acLyrTblRec.Name = layer;

                    // Upgrade the Layer table for write
                    acLyrTbl.UpgradeOpen();

                    // Append the new layer to the Layer table and the transaction
                    acLyrTbl.Add(acLyrTblRec);
                    acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                    acTrans.Commit();
                    id = acLyrTblRec.ObjectId;
                }
                else
                {
                    id = acLyrTbl[layer];
                }
            }
            return id;
        }

        public static void CreateBasicLayersCfast()
        {
            if (Utils.layersCreatedCfast == false)
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

                    Dictionary<string, short> layers = new Dictionary<string, short>();
                    layers.Add("!CFAST_ROOM(0)", 150);
                    layers.Add("!CFAST_CORRIDOR(0)", 32);
                    layers.Add("!CFAST_HALL(0)", 191);
                    layers.Add("!CFAST_DPLAIN(0)", 3);
                    layers.Add("!CFAST_DCLOSER(0)", 2);
                    layers.Add("!CFAST_DELECTRIC(0)", 4);
                    layers.Add("!CFAST_HOLE(0)", 124);
                    layers.Add("!CFAST_WINDOW(0)", 6);
                    layers.Add("!CFAST_VVENT(0)", 4);
                    layers.Add("!CFAST_INLET(0)", 66);
                    layers.Add("!CFAST_MVENT(0)", 254);
                    layers.Add("!CFAST_STAIRCASE(0)", 254);

                    foreach (KeyValuePair<string, short> layer in layers)
                    {

                        if (acLyrTbl.Has(layer.Key) == false)
                        {
                            LayerTableRecord acLyrTblRec = new LayerTableRecord();

                            // Assign the layer the ACI color 1 and a name
                            acLyrTblRec.Color = Color.FromColorIndex(ColorMethod.ByAci, layer.Value);
                            acLyrTblRec.Name = layer.Key;

                            // Upgrade the Layer table for write
                            acLyrTbl.UpgradeOpen();

                            // Append the new layer to the Layer table and the transaction
                            acLyrTbl.Add(acLyrTblRec);
                            acTrans.AddNewlyCreatedDBObject(acLyrTblRec, true);
                        }
                    }
                    acTrans.Commit();
                    Utils.layersCreated = true;
                }
                return;
            }
            return;
        }
        public static void CreateLayerForCurrentFloor(string layer)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            // Get current floor from current layer name
            Regex regEx = new Regex(@"\((.+)\)", RegexOptions.IgnoreCase);
            Match match = regEx.Match(CurrentLayer());
            if (match.Success)
            {
                System.Text.RegularExpressions.Group group = match.Groups[1];
                Int32.TryParse(group.ToString(), out currentFloor);
                try
                {
                    CreateLayer(layer + "(" + currentFloor + ")");
                    return;
                }
                catch (System.Exception e)
                {
                    CreateLayer(layer + "(0)");
                    ed.WriteMessage("\nProgram exception: " + e.ToString());
                    return;
                }
            }
            else
            {
                try
                {
                    CreateLayer(layer + "(0)");
                }
                catch (System.Exception)
                {
                    CreateLayer("0");
                    ed.WriteMessage("\nWarrning! Layer set to 0. There is no layer " + layer);
                    return;
                }
            }
            return;

        }

        [CommandMethod("fCreateBasicLayers")]
        public void fCreateBasicLayers()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            try
            {
                using (DocumentLock docLock = acDoc.LockDocument())
                {
                    // Dorobic obslugę po stronie Web
                    if (Ribbon.RibbonInit.isWebSockedInited)
                    {
                        Websocket.acWebSocketMessage message = new Websocket.acWebSocketMessage("success", "fGetLibraryLayers", null, null);
                        ed.WriteMessage("\nSending FDS objects ...");
                        ed.WriteMessage("\nMessageId: " + message.getId());

                        Websocket.acWebSocketCtrl.syncCtrl.sendMessageAndWaitSync(message);

                        CreateNeededLayers();
                    }
                    else
                    {
                        CreateBasicLayers(true);
                    }
                    return;
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return;
            }
        }

        string getName()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            PromptStringOptions nameOption = new PromptStringOptions("Enter type name");
            nameOption.AllowSpaces = false;
            PromptResult name = ed.GetString(nameOption);
            if (name.Status == PromptStatus.OK)
                return name.StringResult;
            else
                return "";
        }
        [CommandMethod("fCreateFdsLayer")]
        public void fCreateFdsLayer()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                while (true)
                {
                    PromptKeywordOptions typeOptions = new PromptKeywordOptions("\nChoose type");
                    typeOptions.Keywords.Add("Obst");
                    typeOptions.Keywords.Add("Vent");
                    typeOptions.Keywords.Add("Jetf");
                    typeOptions.Keywords.Add("Fire");
                    typeOptions.Keywords.Add("Devc");
                    typeOptions.Keywords.Add("Slcf");
                    typeOptions.AllowNone = false;
                    typeOptions.Keywords.Default = "Obst";
                    PromptResult type = ed.GetKeywords(typeOptions);
                    if (type.Status != PromptStatus.OK || type.Status == PromptStatus.Cancel) goto End;

                    PromptDoubleOptions levelOption = new PromptDoubleOptions("Enter level");
                    levelOption.AllowNone = false;
                    levelOption.DefaultValue = levelOld;
                    PromptDoubleResult level = ed.GetDouble(levelOption);
                    if (level.Status != PromptStatus.OK || level.Status == PromptStatus.Cancel) goto End;
                    if (level.Status == PromptStatus.OK)
                        levelOld = level.Value;

                    if (type.Status != PromptStatus.OK || type.Status == PromptStatus.Cancel) goto End;
                    if (type.Status == PromptStatus.OK)
                    {
                        if (type.StringResult == "Obst")
                        {
                            while (true)
                            {
                                string name = getName();
                                if (name != "")
                                {
                                    CreateLayer("!FDS_OBST[" + name + "](" + level.Value.ToString() + ")", Color.FromColorIndex(ColorMethod.ByAci, 123));
                                }
                                else break;
                            }
                        }
                        else if (type.StringResult == "Vent")
                        {
                            while (true)
                            {
                                string name = getName();
                                if (name != "")
                                {
                                    CreateLayer("!FDS_VENT[" + name + "](" + level.Value.ToString() + ")", Color.FromColorIndex(ColorMethod.ByAci, 6));
                                }
                                else break;
                            }
                        }
                        else if (type.StringResult == "Jetf")
                        {
                            while (true)
                            {
                                string name = getName();
                                if (name != "")
                                {
                                    CreateLayer("!FDS_JETF[" + name + "](" + level.Value.ToString() + ")", Color.FromColorIndex(ColorMethod.ByAci, 54));
                                }
                                else break;
                            }
                        }
                        else if (type.StringResult == "Fire")
                        {
                            while (true)
                            {
                                string name = getName();
                                if (name != "")
                                {
                                    CreateLayer("!FDS_FIRE[" + name + "](" + level.Value.ToString() + ")", Color.FromColorIndex(ColorMethod.ByAci, 1));
                                }
                                else break;
                            }
                        }
                        else if (type.StringResult == "Devc")
                        {
                            while (true)
                            {
                                string name = getName();
                                if (name != "")
                                {
                                    CreateLayer("!FDS_DEVC[" + name + "](" + level.Value.ToString() + ")", Color.FromColorIndex(ColorMethod.ByAci, 7));
                                }
                                else break;
                            }
                        }
                        else if (type.StringResult == "Slcf")
                        {
                            while (true)
                            {
                                string name = getName();
                                if (name != "")
                                {
                                    CreateLayer("!FDS_SLCF[" + name + "](" + level.Value.ToString() + ")", Color.FromColorIndex(ColorMethod.ByAci, 242));
                                }
                                else break;
                            }
                        }
                    }
                }
                End:;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return;
            }
        }

        // !!! Dokonczyc !!!
        [CommandMethod("fCreateLevel")]
        public void fCreateLevel()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                // Get the current document and database, and start a transaction
                Document acDoc = Application.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                PromptDoubleOptions levelO = new PromptDoubleOptions("\nEnter level number:");
                levelO.DefaultValue = 0;
                PromptDoubleResult level = ed.GetDouble(levelO);

                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // This example returns the layer table for the current database
                    LayerTable acLyrTbl;
                    acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                                 OpenMode.ForWrite) as LayerTable;

                    // Step through the Layer table and print each layer name
                    foreach (ObjectId acObjId in acLyrTbl)
                    {
                        LayerTableRecord acLyrTblRec;
                        acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForWrite) as LayerTableRecord;

                        if (acLyrTblRec.Name.Contains("!FDS_") && acLyrTblRec.Name.Contains("("))
                        {
                            // Tutaj dodaj nowa warstwe ...
                            
                            Regex regEx = new Regex(@"(.+)\(", RegexOptions.IgnoreCase);
                            Match match = regEx.Match(acLyrTblRec.Name);
                            if (match.Success)
                            {
                                System.Text.RegularExpressions.Group group = match.Groups[1];

                                LayerTableRecord acLyrTblRecNew = new LayerTableRecord();

                                // Assign the layer the ACI color 1 and a name
                                acLyrTblRecNew.Name = group.ToString() + "(" + level.Value.ToString() + ")";
                                acLyrTblRecNew.Color = acLyrTblRec.Color;

                                // Append the new layer to the Layer table and the transaction
                                if(!acLyrTbl.Has(acLyrTblRecNew.Name))
                                {
                                    acLyrTbl.Add(acLyrTblRecNew);
                                    acTrans.AddNewlyCreatedDBObject(acLyrTblRecNew, true);
                                }
                            }

                            //acLyrTblRec.IsOff = true;
                        }
                    }
                    acTrans.Commit();
                }
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return;
            }
        }

        [CommandMethod("fHideFdsLayers")]
        public void fHideFdsLayers()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                // Get the current document and database, and start a transaction
                Document acDoc = Application.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // This example returns the layer table for the current database
                    LayerTable acLyrTbl;
                    acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                                 OpenMode.ForRead) as LayerTable;

                    if(Layers.CurrentLayer().Contains("!FDS"))
                        Layers.SetLayer("0");

                    // Step through the Layer table and print each layer name
                    foreach (ObjectId acObjId in acLyrTbl)
                    {
                        LayerTableRecord acLyrTblRec;
                        acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForWrite) as LayerTableRecord;

                        if (acLyrTblRec.Name.Contains("!FDS_"))
                        {
                            acLyrTblRec.IsOff = true;
                        }
                    }
                    acTrans.Commit();
                }
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return;
            }
        }

        [CommandMethod("fHideOtherLayers")]
        public void fHideOtherLayers()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                // Get the current document and database, and start a transaction
                Document acDoc = Application.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // This example returns the layer table for the current database
                    LayerTable acLyrTbl;
                    acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                                 OpenMode.ForRead) as LayerTable;


                    if(!Layers.CurrentLayer().Contains("!FDS"))
                    {
                        Utils.Init();
                        Layers.SetLayer("!FDS_OBST[inert](0)");
                    }

                    // Step through the Layer table and print each layer name
                    foreach (ObjectId acObjId in acLyrTbl)
                    {
                        LayerTableRecord acLyrTblRec;
                        acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForWrite) as LayerTableRecord;

                        if (!acLyrTblRec.Name.Contains("!FDS_"))
                        {
                            acLyrTblRec.IsOff = true;
                        }
                    }
                    acTrans.Commit();
                }
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return;
            }
        }

        [CommandMethod("fShowFdsLayers")]
        public void fShowFdsLayers()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                // Get the current document and database, and start a transaction
                Document acDoc = Application.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // This example returns the layer table for the current database
                    LayerTable acLyrTbl;
                    acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                                 OpenMode.ForRead) as LayerTable;

                    // Step through the Layer table and print each layer name
                    foreach (ObjectId acObjId in acLyrTbl)
                    {
                        LayerTableRecord acLyrTblRec;
                        acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForWrite) as LayerTableRecord;

                        if (acLyrTblRec.Name.Contains("!FDS_"))
                        {
                            acLyrTblRec.IsOff = false;
                        }
                    }
                    acTrans.Commit();
                }
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return;
            }
        }

        [CommandMethod("fShowOtherLayers")]
        public void fShowOtherLayers()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                // Get the current document and database, and start a transaction
                Document acDoc = Application.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // This example returns the layer table for the current database
                    LayerTable acLyrTbl;
                    acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                                 OpenMode.ForRead) as LayerTable;

                    // Step through the Layer table and print each layer name
                    foreach (ObjectId acObjId in acLyrTbl)
                    {
                        LayerTableRecord acLyrTblRec;
                        acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForWrite) as LayerTableRecord;

                        if (!acLyrTblRec.Name.Contains("!FDS_"))
                        {
                            acLyrTblRec.IsOff = false;
                        }
                    }
                    acTrans.Commit();
                }
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return;
            }
        }

        [CommandMethod("fShowLevel")]
        public void fShowLevel()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                // Get the current document and database, and start a transaction
                Document acDoc = Application.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                while (true)
                {
                    PromptDoubleOptions levelO = new PromptDoubleOptions("\nEnter level number:");
                    levelO.DefaultValue = 0;
                    PromptDoubleResult level = ed.GetDouble(levelO);
                    if (level.Status != PromptStatus.OK || level.Status == PromptStatus.Cancel) goto End;
                    if (level.Status == PromptStatus.OK)
                    {
                        using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                        {
                            // This example returns the layer table for the current database
                            LayerTable acLyrTbl;
                            acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                                         OpenMode.ForRead) as LayerTable;

                            // Step through the Layer table and print each layer name
                            foreach (ObjectId acObjId in acLyrTbl)
                            {
                                LayerTableRecord acLyrTblRec;
                                acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForWrite) as LayerTableRecord;

                                if (acLyrTblRec.Name.Contains("!FDS_") && acLyrTblRec.Name.Contains("("))
                                {
                                    Regex regEx = new Regex(@"\((.+)\)", RegexOptions.IgnoreCase);
                                    Match match = regEx.Match(acLyrTblRec.Name);
                                    if (match.Success)
                                    {
                                        double levelLayer;
                                        System.Text.RegularExpressions.Group group = match.Groups[1];
                                        Double.TryParse(group.ToString(), out levelLayer);

                                        if (level.Value == levelLayer)
                                        {
                                            acLyrTblRec.IsOff = false;
                                        }
                                    }
                                }
                            }
                            acTrans.Commit();
                        }
                    }
                }
                End:;
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return;
            }
        }

        [CommandMethod("fHideLevel")]
        public void fHideLevel()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                // Get the current document and database, and start a transaction
                Document acDoc = Application.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                while (true)
                {
                    PromptDoubleOptions levelO = new PromptDoubleOptions("\nEnter level number:");
                    levelO.DefaultValue = 0;
                    PromptDoubleResult level = ed.GetDouble(levelO);
                    if (level.Status != PromptStatus.OK || level.Status == PromptStatus.Cancel) goto End;
                    if (level.Status == PromptStatus.OK)
                    {
                        using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                        {
                            // This example returns the layer table for the current database
                            LayerTable acLyrTbl;
                            acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId,
                                                         OpenMode.ForRead) as LayerTable;

                            // Step through the Layer table and print each layer name
                            foreach (ObjectId acObjId in acLyrTbl)
                            {
                                LayerTableRecord acLyrTblRec;
                                acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForWrite) as LayerTableRecord;

                                if (acLyrTblRec.Name.Contains("!FDS_") && acLyrTblRec.Name.Contains("("))
                                {
                                    Regex regEx = new Regex(@"\((.+)\)", RegexOptions.IgnoreCase);
                                    Match match = regEx.Match(acLyrTblRec.Name);
                                    if (match.Success)
                                    {
                                        double levelLayer;
                                        System.Text.RegularExpressions.Group group = match.Groups[1];
                                        Double.TryParse(group.ToString(), out levelLayer);

                                        if (level.Value == levelLayer)
                                        {
                                            acLyrTblRec.IsOff = true;
                                        }
                                    }
                                }
                            }
                            acTrans.Commit();
                        }
                    }
                }
                End:;
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                return;
            }
        }

    }
}
