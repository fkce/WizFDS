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
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
#endif

using System;
using WizFDS.Websocket;
using System.IO;
using System.Windows.Forms;
using System.Text.RegularExpressions;
using System.Globalization;


namespace WizFDS.Utils
{
    public class Temp
    {
        Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;


        [CommandMethod("fCONVERTLAYERS")]
        public void fCONVERTLAYERS()
        {

            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            ed.WriteMessage("convertLayers\n");

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {

                // This example returns the layer table for the current database
                LayerTable acLyrTbl;
                acLyrTbl = acTrans.GetObject(acCurDb.LayerTableId, OpenMode.ForRead) as LayerTable;

                // Step through the Layer table and print each layer name
                foreach (ObjectId acObjId in acLyrTbl)
                {
                    LayerTableRecord acLyrTblRec;
                    acLyrTblRec = acTrans.GetObject(acObjId, OpenMode.ForWrite) as LayerTableRecord;
                    if (acLyrTblRec.Name.Contains("_EK_geom"))
                    {
                        string layName = acLyrTblRec.Name.Substring(9, acLyrTblRec.Name.Length - 12);
                        string level = acLyrTblRec.Name.Substring(acLyrTblRec.Name.Length - 3);
                        int levelInt = Int32.Parse(level);
                        if (acLyrTblRec.Name.Contains("FDS_hole"))
                        {
                            acLyrTblRec.Name = "!FDS_HOLE(" + levelInt.ToString() + ")";
                        } 
                        else
                        {
                            acLyrTblRec.Name = "!FDS_OBST[" + layName + "](" + levelInt.ToString() + ")";
                        }
                    }
                    else if (acLyrTblRec.Name.Contains("_EK_curt"))
                    {
                        string level = acLyrTblRec.Name.Substring(acLyrTblRec.Name.Length - 3);
                        int levelInt = Int32.Parse(level);

                        acLyrTblRec.Name = "!FDS_OBST[FDS_curt](" + levelInt.ToString() + ")";
                    }
                    else if (acLyrTblRec.Name.Contains("_EK_supl"))
                    {
                        acLyrTblRec.Name = "!FDS_OBST[FDS_supl](0)";
                    }
                    else if (acLyrTblRec.Name.Contains("_EK_fire"))
                    {
                        // _EK_fire_1
                        string layName = acLyrTblRec.Name.Substring(4, acLyrTblRec.Name.Length - 4);
                        acLyrTblRec.Name = "!FDS_FIRE[" + layName + "]";
                    }
                    else if (acLyrTblRec.Name.Contains("_EK_slcf"))
                    {
                        // _EK_slcf_TEMPERATURE
                        string layName = acLyrTblRec.Name.Substring(9, acLyrTblRec.Name.Length - 9);
                        acLyrTblRec.Name = "!FDS_SLCF[" + layName + "]";
                    }
                    else if (acLyrTblRec.Name.Contains("_EK_devc"))
                    {
                        // _EK_devc_t
                        string layName = acLyrTblRec.Name.Substring(9, acLyrTblRec.Name.Length - 9);
                        acLyrTblRec.Name = "!FDS_DEVC[" + layName + "]";
                    }
                    else if (acLyrTblRec.Name.Contains("_EK_went_kratka"))
                    {
                        // _EK_went_kratka_5000_+01
                        string layName = acLyrTblRec.Name.Substring(16, acLyrTblRec.Name.Length - 20);
                        string level = acLyrTblRec.Name.Substring(acLyrTblRec.Name.Length - 3);
                        int levelInt = Int32.Parse(level);

                        acLyrTblRec.Name = "!FDS_VENT[" + layName + "](" + levelInt.ToString() + ")";
                    }
                    else if (acLyrTblRec.Name.Contains("_EK_mesh"))
                    {
                        acLyrTblRec.Name = "!FDS_MESH";
                    }
                    else if (acLyrTblRec.Name.Contains("_EK_open"))
                    {
                        acLyrTblRec.Name = "!FDS_MESH[open]";
                    }
                    else if (acLyrTblRec.Name.Contains("_EK_jetf"))
                    {
                        if (acLyrTblRec.Name.Contains("_EK_jetf_devc"))
                        {
                            acLyrTblRec.Name = "!FDS_JETF[jetfan]";
                        }
                        else
                        {
                            acLyrTblRec.Name = "!FDS_JETF[jetfan]";
                        }
                    }
                    else if (acLyrTblRec.Name.Contains("_EK_pomoc"))
                    {
                        acLyrTblRec.Name = "!FDS_COMMENTS";
                    }

                    Layers.SetLayer("0");
                    // Usun nieuzywane warstwy
                    ObjectIdCollection layIds = new ObjectIdCollection();

                    foreach (ObjectId id in acLyrTbl)
                    {
                        layIds.Add(id);
                    }

                    //this function will remove all
                    //layers which are used in the drawing file
                    acCurDb.Purge(layIds);

                    foreach (ObjectId id in layIds)
                    {
                        DBObject obj = acTrans.GetObject(id, OpenMode.ForWrite);
                        obj.Erase();
                    }
                }
                // Save the new object to the database
                acTrans.Commit();

            }
        }

        [CommandMethod("xx")]
        public void xx()
        {

            Utils.Init();
            //Utils.Utils.UtilsInitCfast();
            Utils.CreateBox(0, 4, 0, 0.2, 0, 3, "!FDS_OBST[inert](0)");
            Utils.CreateBox(-0.2, 0, 0, 4, 0, 3, "!FDS_OBST[inert](0)");
            Utils.CreateBox(-1, 5, -2, 8, 0, 3.6, "!FDS_MESH");
            Utils.CreateExtrudedSurface(new Point3d(2, 2, 2), new Point3d(2, 2.4, 2.2), "!FDS_VENT[vent]");
            Utils.CreateExtrudedSurface(new Point3d(4, -2.4, 0), new Point3d(4, 8.4, 3.0), "!FDS_SLCF[slice]");

            Utils.ZoomInit();
        }

        [CommandMethod("IFDS")]
        public void iFds()
        {
            CultureInfo culture = new CultureInfo("en-US");
            Utils.Init();
            OpenFileDialog theDialog = new OpenFileDialog();
            theDialog.Title = "Open FDS file";
            theDialog.Filter = "FDS files (*.fds)|*.fds|All files (*.*)|*.*";
            theDialog.RestoreDirectory = true; 

            if (theDialog.ShowDialog() == DialogResult.OK)
            {
                string filename = theDialog.FileName;
                string[] filelines = File.ReadAllLines(filename);

                double x1, x2, y1, y2, z1, z2;
                string surf = "";

                foreach(string line in filelines)
                {
                    if (line.Contains("&OBST"))
                    {
                        //&OBST ID = 'OBST1', XB = 6.8,7., 7,64, 1.8,5.234, SURF_ID = 'gypsum_board' /
                        surf = "";

                        Regex regExXb = new Regex(@"XB\s*=\s*(\-*\d*\.{0,1}\d*)\s*,\s*(\-*\d*\.{0,1}\d*)\s*,\s*(\-*\d*\.{0,1}\d*)\s*,\s*(\-*\d*\.{0,1}\d*)\s*,\s*(\-*\d*\.{0,1}\d*)\s*,\s*(\-*\d*\.{0,1}\d*)", RegexOptions.IgnoreCase);
                        Match xb = regExXb.Match(line);

                        if (xb.Success)
                        {
                            System.Text.RegularExpressions.Group x1G = xb.Groups[1];
                            System.Text.RegularExpressions.Group x2G = xb.Groups[2];
                            System.Text.RegularExpressions.Group y1G = xb.Groups[3];
                            System.Text.RegularExpressions.Group y2G = xb.Groups[4];
                            System.Text.RegularExpressions.Group z1G = xb.Groups[5];
                            System.Text.RegularExpressions.Group z2G = xb.Groups[6];
                            x1 = Convert.ToDouble(x1G.Value, culture);
                            x2 = Convert.ToDouble(x2G.Value, culture);
                            y1 = Convert.ToDouble(y1G.Value, culture);
                            y2 = Convert.ToDouble(y2G.Value, culture);
                            z1 = Convert.ToDouble(z1G.Value, culture);
                            z2 = Convert.ToDouble(z2G.Value, culture);

                            ed.WriteMessage(x1.ToString() + "\n");
                            ed.WriteMessage(x2.ToString() + "\n");
                            ed.WriteMessage(y1.ToString() + "\n");
                            ed.WriteMessage(y2.ToString() + "\n");
                            ed.WriteMessage(z1.ToString() + "\n");
                            ed.WriteMessage(z2.ToString() + "\n");

                            Regex regExSurfId = new Regex(@"SURF_ID\s*=\s*'(.*)'", RegexOptions.IgnoreCase);
                            Match surfId = regExSurfId.Match(line);
                            surf = surfId.Success ? "!FDS_OBST[" + surfId.Groups[1].Value + "](0)" : "!FDS_OBST[inert](0)";

                            Layers.CreateLayer(surf);

                            if(x1 != x2 && y1 != y2 && z1 != z2)
                            {
                                Utils.CreateBox(x1, x2, y1, y2, z1, z2, surf);
                            }
                     
                        }
                    }
                    //ed.WriteMessage(filelines[i]);
                }
            }

            //Utils.CreateBox(0, 4, 0, 0.2, 0, 3, "!FDS_OBST[inert](0)");
            //Utils.CreateBox(-0.2, 0, 0, 4, 0, 3, "!FDS_OBST[inert](0)");
            //Utils.CreateBox(-1, 5, -2, 8, 0, 3.6, "!FDS_MESH");
            //Utils.CreateExtrudedSurface(new Point3d(2, 2, 2), new Point3d(2, 2.4, 2.2), "!FDS_VENT[vent]");
            //Utils.CreateExtrudedSurface(new Point3d(4, -2.4, 0), new Point3d(4, 8.4, 3.0), "!FDS_SLCF[slice]");

            //Utils.ZoomInit();
        }

    }
}
