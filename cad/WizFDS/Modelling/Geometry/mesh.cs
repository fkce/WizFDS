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
using System.Collections.Generic;
using System.Linq;

// TODO:
// Automatyczne tworzenie siatki po podaniu określonej ilości siatek
// Dodac zaawansowany algorytm dzielenia siatek w ksztalcie litery L, T, C itp.

namespace WizFDS.Modelling.Geometry
{
    public class Mesh
    {
        double zMinOld = 0.0;
        double zMaxOld = 3.0;
        
        [CommandMethod("fMESH")]
        public void fMESH(){
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Utils.Utils.Init();
            // Change layer to fds_mesh
            Utils.Layers.SetLayer("!FDS_MESH");

            // Box height
            double H = 0;

            // Get Z-min level
            PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter mesh Z-min level:");
            zMinO.DefaultValue = zMinOld;
            PromptDoubleResult zMin = ed.GetDouble(zMinO);
            if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
            zMinOld = zMin.Value;
            Utils.Utils.SetUCS(zMin.Value);
                        
            // Check if Z-max is less then Z-min
            while (true)
            {
                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter mesh Z-max level:");
                zMaxO.DefaultValue = zMaxOld;
                PromptDoubleResult zMax = ed.GetDouble(zMaxO);
                zMaxOld = zMax.Value;
                if (zMax.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                if (zMax.Value <= zMin.Value)
                {
                    ed.WriteMessage("\nZ-max level should be greater than Z-min level");
                }
                else
                {
                    H = zMax.Value - zMin.Value;
                    break;
                }
            }
            
            PromptPointOptions p1O = new PromptPointOptions("\nSpecify mesh first point ");
            PromptPointResult p1;
            while (true)
            {
                p1 = ed.GetPoint(p1O);
                if (p1.Status == PromptStatus.Cancel)
                {
                    break;
                }
                if (p1.Status != PromptStatus.OK) break;
                else
                {
                    while (true)
                    {
                        var p2 = ed.GetUcsCorner("\nPick mesh opposite corner: ", p1.Value);
                        if (p2.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                        if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                        {
                            Utils.Utils.CreateBox(p1.Value, p2.Value, H, zMin.Value);
                            break;
                        }
                        else
                        {
                            ed.WriteMessage("\nPick correct corner!");
                        }
                    }


                }

            }
            Utils.Utils.End();
        }

        // TODO: 
        // 5. Sprawdzić względem ilości elementów, tj. ponowną iterację, aby ilość elementów była taka sama - ale tutaj musi iteracyjnie chodzić kilka pętli
        [CommandMethod("fMESHAUTO")]
        public void fMESHAUTO(){
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Utils.Utils.Init();

                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                if (!Utils.Layers.CurrentLayer().Contains("!FDS_MESH"))
                    Utils.Layers.SetLayer("!FDS_MESH");

                Utils.Utils.SetOrtho(false);

                PromptDoubleOptions snapO = new PromptDoubleOptions("\nEnter cell size:");
                snapO.DefaultValue = Utils.Utils.snapUnit.X;
                PromptDoubleResult snap = ed.GetDouble(snapO);
                if (snap.Status != PromptStatus.OK || snap.Status == PromptStatus.Cancel) goto End;
                Utils.Utils.SetSnapUnit(new Point2d(snap.Value, snap.Value));

                PromptPointOptions p1Option = new PromptPointOptions("\nSpecify mesh area first corner:");
                p1Option.AllowNone = false;
                PromptPointResult p1 = ed.GetPoint(p1Option);
                if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto End;

                var p2 = ed.GetUcsCorner("Pick mesh area opposite corner:", p1.Value);
                if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) goto End;

                ObjectId recId = Utils.Utils.CreateRectangle(p1.Value, p2.Value, "!FDS_MESH");
                // Vertical - pionowy
                // Horizontal - poziomy

                PromptIntegerOptions noMeshVerO = new PromptIntegerOptions("\nEnter vertical mesh number:");
                noMeshVerO.DefaultValue = 1;
                PromptIntegerResult noMeshVer = ed.GetInteger(noMeshVerO);
                if (noMeshVer.Status != PromptStatus.OK || noMeshVer.Status == PromptStatus.Cancel) goto End;

                PromptIntegerOptions noMeshHorO = new PromptIntegerOptions("\nEnter horizontal mesh number:");
                noMeshHorO.DefaultValue = 1;
                PromptIntegerResult noMeshHor = ed.GetInteger(noMeshHorO);
                if (noMeshHor.Status != PromptStatus.OK || noMeshHor.Status == PromptStatus.Cancel) goto End;

                // Usun zaznaczenie
                Utils.Utils.DeleteObject(recId);

                double horizontalDistance = Math.Abs(p2.Value.X - p1.Value.X);
                double verticalDistance = Math.Abs(p2.Value.Y - p1.Value.Y);

                double horizontalUnitDistance = Math.Ceiling(horizontalDistance / noMeshHor.Value / snap.Value) * snap.Value;
                double verticalUnitDistance = Math.Ceiling(verticalDistance / noMeshVer.Value / snap.Value) * snap.Value;

                horizontalUnitDistance = horizontalUnitDistance + (horizontalUnitDistance % snap.Value);
                verticalUnitDistance = verticalUnitDistance + (verticalUnitDistance % snap.Value);

                ed.WriteMessage("\nHorizontal distance:");
                ed.WriteMessage(horizontalDistance.ToString());

                ed.WriteMessage("\nHorizontal unit distance:");
                ed.WriteMessage(horizontalUnitDistance.ToString());

                Extents3d ext = new Extents3d();
                ext.AddPoint(p1.Value);
                ext.AddPoint(p2.Value);

                List<double> horizontalPoints = new List<double>();
                for(int i = 0; i < noMeshHor.Value; i++)
                {
                    horizontalPoints.Add(ext.MinPoint.X + i * horizontalUnitDistance);
                }

                List<double> verticalPoints = new List<double>();
                for(int i = 0; i < noMeshVer.Value; i++)
                {
                    verticalPoints.Add(ext.MinPoint.Y + i * verticalUnitDistance);
                }

                List<double[]> boxes = new List<double[]>();

                horizontalPoints.ForEach(delegate (double xPoint1)
                {
                    double xPoint2 = xPoint1 + horizontalUnitDistance;
                    if (xPoint1 == horizontalPoints.Last())
                        xPoint2 = ext.MaxPoint.X;

                    verticalPoints.ForEach(delegate (double yPoint1)
                    {
                        double yPoint2 = yPoint1 + verticalUnitDistance;
                        if (yPoint1 == verticalPoints.Last())
                            yPoint2 = ext.MaxPoint.Y;

                        // Wyznaczanie Z do siatek

                        // !!! Dodać filtr warstw ...
                        // !!! Czy po Z rysujemy tez kilka siatek ...
                        PromptSelectionResult acSSPrompt;
                        acSSPrompt = ed.SelectCrossingWindow(new Point3d(xPoint1, yPoint1, 0), new Point3d(xPoint2, yPoint2, 0));
                        if (acSSPrompt.Status == PromptStatus.OK)
                        {
                            Extents3d extZ = new Extents3d();
                            SelectionSet acSSet = acSSPrompt.Value;

                            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                            {
                                foreach (var id in acSSet.GetObjectIds())
                                {
                                    var ent = acTrans.GetObject(id, OpenMode.ForRead) as Entity;
                                    if (ent != null)
                                    {
                                        extZ.AddExtents(ent.GeometricExtents);
                                    }
                                }
                            }
                            // !!! Sprawdzic czy z jest wielokrotnoscia skoku - rysowane na innym skoku
                            boxes.Add(new double[6] {xPoint1, xPoint2, yPoint1, yPoint2, extZ.MinPoint.Z, extZ.MaxPoint.Z} );
                        }
                        else
                        {
                            //acApp.ShowAlertDialog("No objects of objects in area");
                            ed.WriteMessage("\nNo mesh needed");
                        }
                    });
                });

                if(boxes.Count > 0)
                {
                    boxes.ForEach(delegate (double[] point)
                    {
                        Utils.Utils.CreateBox(point[0], point[1], point[2], point[3], point[4], point[5], "!FDS_MESH");
                    });
                }

            End:;
                Utils.Utils.End();
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
            }
        }
    }
}