#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Teigha.DatabaseServices;
using Bricscad.EditorInput;
using Teigha.Geometry;
using Teigha.Runtime;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
#endif

using System;

namespace WizFDS.Modelling.Ventilation
{
    public class Vent
    {
        double zMinOld = 2.0;
        double zMaxOld = 2.2;
        double heightOld = 0.2;

        [CommandMethod("fVENT")]
        public void fVENT()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Utils.Utils.Init();
                if (!Utils.Layers.CurrentLayer().Contains("!FDS_VENT"))
                    Utils.Layers.SetLayerType("!FDS_VENT");

                while (true)
                {
                    PromptKeywordOptions orientationOptions = new PromptKeywordOptions("\nChoose vent orientation");
                    orientationOptions.Keywords.Add("Horizontal");
                    orientationOptions.Keywords.Add("Vertical");
                    orientationOptions.AllowNone = false;
                    PromptResult orientation = ed.GetKeywords(orientationOptions);

                    if (orientation.Status != PromptStatus.OK || orientation.Status == PromptStatus.Cancel) { Utils.Utils.End(); break; }
                    if (orientation.Status == PromptStatus.OK)
                    {
                        if (orientation.StringResult == "Vertical")
                        {
                            while (true)
                            {

                                PromptDoubleOptions zMinOption = new PromptDoubleOptions("Enter vent Z-min level");
                                zMinOption.AllowNone = false;
                                zMinOption.DefaultValue = zMinOld;
                                PromptDoubleResult zMin = ed.GetDouble(zMinOption);
                                if (zMin.Status != PromptStatus.OK || zMin.Status == PromptStatus.Cancel) goto End;
                                zMinOld = zMin.Value;
                                Utils.Utils.SetUCS(zMin.Value);

                                double height;
                                PromptDoubleResult zMax;
                                PromptDoubleResult heightResult;
                                // Enter Z-max (and check if > Z-min) or Height 
                                while (true)
                                {
                                    PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter vent Z-max level or ");
                                    zMaxO.DefaultValue = zMaxOld;
                                    zMaxO.Keywords.Add("Height");
                                    zMax = ed.GetDouble(zMaxO);
                                    if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                                    {
                                        PromptDoubleOptions heightO = new PromptDoubleOptions("\nEnter vent height:");
                                        heightO.DefaultValue = heightOld;
                                        heightO.AllowNone = false;
                                        heightO.AllowZero = false;
                                        heightO.AllowNegative = false;
                                        heightResult = ed.GetDouble(heightO);
                                        if (heightResult.Status == PromptStatus.OK)
                                        {
                                            height = heightResult.Value;
                                            heightOld = heightResult.Value;
                                            break;
                                        }
                                    }
                                    else if (zMax.Status != PromptStatus.OK) goto End;
                                    else if (zMax.Value <= zMin.Value)
                                    {
                                        ed.WriteMessage("\nZ-max level should be greater than Z-min level");
                                    }
                                    else
                                    {
                                        zMaxOld = zMax.Value;
                                        height = zMax.Value - zMin.Value;
                                        break;
                                    }
                                }

                                Utils.Utils.SetOrtho(true);

                                while (true)
                                {
                                    PromptPointOptions p1Option = new PromptPointOptions("\nSpecify vent first corner:");
                                    p1Option.AllowNone = false;
                                    PromptPointResult p1 = ed.GetPoint(p1Option);
                                    if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto End;

                                    PromptPointOptions p2Option = new PromptPointOptions("\nSpecify vent second corner:");
                                    p2Option.AllowNone = false;
                                    p2Option.UseBasePoint = true;
                                    p2Option.BasePoint = p1.Value;
                                    PromptPointResult p2 = ed.GetPoint(p2Option);
                                    if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) goto End;
                                    Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMax.Value));
                                }
                            }
                        }
                        else if (orientation.StringResult == "Horizontal")
                        {
                            while (true)
                            {
                                PromptDoubleOptions zlevelOption = new PromptDoubleOptions("Enter vent Z level");
                                zlevelOption.AllowNone = false;
                                zlevelOption.DefaultValue = zMinOld;
                                PromptDoubleResult zlevel = ed.GetDouble(zlevelOption);
                                if (zlevel.Status != PromptStatus.OK || zlevel.Status == PromptStatus.Cancel) goto End;
                                zMinOld = zlevel.Value;
                                Utils.Utils.SetUCS(zlevel.Value);

                                Utils.Utils.SetOrtho(false);

                                while (true)
                                {
                                    PromptPointOptions p1Option = new PromptPointOptions("\nSpecify vent first corner:");
                                    p1Option.AllowNone = false;
                                    PromptPointResult p1 = ed.GetPoint(p1Option);
                                    if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto End;

                                    var p2 = ed.GetUcsCorner("Pick vent opposite corner:", p1.Value);
                                    if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) goto End;
                                    Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zlevel.Value), new Point3d(p2.Value.X, p2.Value.Y, zlevel.Value));
                                }
                            }
                        }

                    }
                    End:;
                }
                Utils.Utils.End();
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                Utils.Utils.End();
            }
        }

        [CommandMethod("fJETFAN")]
        public void fJETFAN()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Utils.Utils.Init();

                // Get zMin & zMax | height level
                PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter Z-min level:");
                zMinO.DefaultValue = zMinOld;
                PromptDoubleResult zMin = ed.GetDouble(zMinO);
                if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                zMinOld = zMin.Value;
                Utils.Utils.SetUCS(zMin.Value);

                double height;
                PromptDoubleResult zMax;
                PromptDoubleResult heightResult;
                // Enter Z-max (and check if > Z-min) or Height 
                while (true)
                {
                    PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter Z-max level or ");
                    zMaxO.Keywords.Add("Height");
                    zMaxO.DefaultValue = zMaxOld;
                    zMax = ed.GetDouble(zMaxO);
                    if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                    {
                        PromptDoubleOptions heightO = new PromptDoubleOptions("\nEnter height:");
                        heightO.DefaultValue = heightOld;
                        heightO.AllowNone = false;
                        heightO.AllowZero = false;
                        heightO.AllowNegative = false;
                        heightResult = ed.GetDouble(heightO);
                        if (heightResult.Status == PromptStatus.OK)
                        {
                            height = heightResult.Value;
                            heightOld = heightResult.Value;
                            break;
                        }
                    }
                    else if (zMax.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                    else if (zMax.Value <= zMin.Value)
                    {
                        ed.WriteMessage("\nZ-max level should be greater than Z-min level");
                    }
                    else
                    {
                        zMaxOld = zMax.Value;
                        height = zMax.Value - zMin.Value;
                        break;
                    }
                }

                while (true)
                {
                    if(!Utils.Layers.CurrentLayer().Contains("!FDS_JETF"))
                        Utils.Layers.SetLayer("!FDS_JETF[jetfan]");

                    PromptPointOptions p1Option = new PromptPointOptions("\nSpecify jet-fan first corner:");
                    p1Option.AllowNone = false;
                    PromptPointResult p1 = ed.GetPoint(p1Option);
                    if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) break;

                    var p2 = ed.GetUcsCorner("Pick jet-fan opposite corner:", p1.Value);
                    if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) break;

                    ObjectId jetObstId = Utils.Utils.CreateBox(p1.Value, p2.Value, height, zMin.Value, true);

                    Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                    Database acCurDb = acDoc.Database;
                    Extents3d jetExt;
                    using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                    {
                        Entity acEnt = acTrans.GetObject(jetObstId, OpenMode.ForRead) as Entity;
                        jetExt = acEnt.GeometricExtents;
                    }

                    PromptPointOptions p1DirO = new PromptPointOptions("\nSpecify jet-fan direction");
                    p1DirO.AllowNone = false;
                    PromptPointResult p1Dir = ed.GetPoint(p1DirO);
                    if (p1Dir.Status != PromptStatus.OK || p1Dir.Status == PromptStatus.Cancel) break;

                    Point3d center = new Point3d(jetExt.MinPoint.X + (jetExt.MaxPoint.X - jetExt.MinPoint.X) / 2, jetExt.MinPoint.Y + (jetExt.MaxPoint.Y - jetExt.MinPoint.Y) / 2, jetExt.MinPoint.Z);
                    ed.WriteMessage(center.ToString());
                    // Tutaj tworzenie polilinii + xdata kierunek ...
                    // Po X jet-fan
                    if(Math.Abs(jetExt.MaxPoint.X - jetExt.MinPoint.X) > Math.Abs(jetExt.MaxPoint.Y - jetExt.MinPoint.Y))
                    {
                        if(p1Dir.Value.X < jetExt.MinPoint.X)
                        {
                            Utils.Xdata.SaveXdata(AddJetfanDirection(center, "-x").ToString(), jetObstId);
                        }
                        else
                        {
                            Utils.Xdata.SaveXdata(AddJetfanDirection(center, "+x").ToString(), jetObstId);
                        }
                    }
                    // Po Y jet-fan
                    else
                    {
                        if(p1Dir.Value.Y < jetExt.MinPoint.Y)
                        {
                            Utils.Xdata.SaveXdata(AddJetfanDirection(center, "-y").ToString(), jetObstId);
                        }
                        else
                        {
                            Utils.Xdata.SaveXdata(AddJetfanDirection(center, "+y").ToString(), jetObstId);
                        }
                    }

                }
                Utils.Utils.End();
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                Utils.Utils.End();
            }

        }

        public long AddJetfanDirection(Point3d center, string direction)
        {
            // Get the current document and database
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            long idPoly = 0;

            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Block table for read
                BlockTable acBlkTbl;
                acBlkTbl = acTrans.GetObject(acCurDb.BlockTableId,
                                                OpenMode.ForRead) as BlockTable;

                // Open the Block table record Model space for write
                BlockTableRecord acBlkTblRec;
                acBlkTblRec = acTrans.GetObject(acBlkTbl[BlockTableRecord.ModelSpace],
                                                OpenMode.ForWrite) as BlockTableRecord;

                Point2d p1 = new Point2d();
                Point2d p2 = new Point2d();
                Point2d p3 = new Point2d();
                
                if(direction == "+x")
                {
                    p1 = new Point2d(center.X - 0.4, center.Y);
                    p2 = new Point2d(center.X + 0.2, center.Y);
                    p3 = new Point2d(center.X + 0.4, center.Y);
                }
                else if(direction == "-x")
                {
                    p1 = new Point2d(center.X + 0.4, center.Y);
                    p2 = new Point2d(center.X - 0.2, center.Y);
                    p3 = new Point2d(center.X - 0.4, center.Y);
                }
                else if(direction == "-y")
                {
                    p1 = new Point2d(center.X, center.Y + 0.4);
                    p2 = new Point2d(center.X, center.Y - 0.2);
                    p3 = new Point2d(center.X, center.Y - 0.4);
                }
                else if(direction == "+y")
                {
                    p1 = new Point2d(center.X, center.Y - 0.4);
                    p2 = new Point2d(center.X, center.Y + 0.2);
                    p3 = new Point2d(center.X, center.Y + 0.4);
                }

                // Create a lightweight polyline
                using (Polyline acPoly = new Polyline())
                {
                    acPoly.AddVertexAt(0, p1, 0, 0, 0);
                    acPoly.AddVertexAt(1, p2, 0, 0, 0);
                    acPoly.AddVertexAt(2, p3, 0, 0, 0);

                    // Create a matrix and move the circle using a vector from (0,0,0) to (2,0,0)
                    Point3d acPt3d = new Point3d(0, 0, 0);
                    Vector3d acVec3d = acPt3d.GetVectorTo(new Point3d(0, 0, center.Z));

                    acPoly.TransformBy(Matrix3d.Displacement(acVec3d));

                    // Add the new object to the block table record and the transaction
                    acBlkTblRec.AppendEntity(acPoly);
                    acTrans.AddNewlyCreatedDBObject(acPoly, true);

                    // Sets the bulge at index 3
                    //acPoly.SetBulgeAt(1, -0.5);

                    // Sets the start and end width at index 4
                    acPoly.SetStartWidthAt(1, 0.1);
                    acPoly.SetEndWidthAt(2, 0.2);

                    idPoly = Export.ImportUtils.GetAcId(acPoly);
                }
                // Save the new objects to the database
                acTrans.Commit();
                return idPoly;
            }
        }

    }
}