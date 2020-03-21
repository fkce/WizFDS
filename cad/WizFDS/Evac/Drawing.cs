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
using Autodesk.AutoCAD.DatabaseServices;
using acDb = Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
using System;
#endif

namespace WizFDS.Evac
{
    public class Drawing
    {
        double zMinOld = 0.0;

        /// <summary>
        /// Create slice volume for evacuation purpose:
        /// hide blocks which are beneath specific level
        /// </summary>
        [CommandMethod("fEvacLevel")]
        public void fEvacLevel()
        {
            Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            Utils.Layers.fFilterFdsObstEvacLayers();

            // Get Z-min level
            PromptDoubleResult zMinLevel;
            PromptDoubleOptions zMinLevelO = new PromptDoubleOptions("\nEnter Z-min level");
            zMinLevelO.DefaultValue = zMinOld;
            zMinLevel = ed.GetDouble(zMinLevelO);
            if (zMinLevel.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
            else
            {
                zMinOld = zMinLevel.Value;
            }

            Extents3d boundingBox = Utils.Utils.GetAllElementsBoundingBox();
            double yHalf = (boundingBox.MaxPoint.Y - boundingBox.MinPoint.Y) / 2;
            Point3dCollection pts = new Point3dCollection
            {
                new Point3d(boundingBox.MinPoint.X - 1, boundingBox.MinPoint.Y + yHalf, zMinLevel.Value),
                new Point3d(boundingBox.MaxPoint.X + 1, boundingBox.MinPoint.Y + yHalf, zMinLevel.Value)
            };

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Block table record for read
                BlockTable acBlkTbl;
                acBlkTbl = acTrans.GetObject(acCurDb.BlockTableId, OpenMode.ForRead) as BlockTable;

                // Open the Block table record Model space for write
                BlockTableRecord acBlkTblRec;
                acBlkTblRec = acTrans.GetObject(acBlkTbl[BlockTableRecord.ModelSpace], OpenMode.ForWrite) as BlockTableRecord;

                SectionType st = SectionType.LiveSection;
                try
                {
                    // Now let's create our section
                    Section sec = new Section(pts, Vector3d.YAxis, Vector3d.ZAxis);
                    sec.State = SectionState.Volume;

                    // The section must be added to the drawing
                    ObjectId secId = acBlkTblRec.AppendEntity(sec);
                    acTrans.AddNewlyCreatedDBObject(sec, true);

                    // Set up some of its direct properties
                    sec.SetHeight(SectionHeight.HeightAboveSectionLine, yHalf + 1);
                    sec.SetHeight(SectionHeight.HeightBelowSectionLine, yHalf + 1);

                    // ... and then its settings
                    SectionSettings ss = (SectionSettings)acTrans.GetObject(sec.Settings, OpenMode.ForWrite);

                    // Set our section type
                    ss.CurrentSectionType = st;

                    // We only set one additional option if "Live"
                    sec.IsLiveSectionEnabled = true;
                    acTrans.Commit();
                }
                catch (System.Exception ex)
                {
                    ed.WriteMessage("\nException: " + ex.Message);
                }
            }
        }

        /// <summary>
        /// Extract boundary from obst geometry
        /// </summary>
        [CommandMethod("fEvacBoundary")]
        public void fEvacBoundary()
        {
            Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            Utils.Utils.Init();

            // Get Z-min level
            PromptDoubleResult zMinLevel;
            PromptDoubleOptions zMinLevelO = new PromptDoubleOptions("\nEnter Z-min level");
            zMinLevelO.DefaultValue = zMinOld;
            zMinLevel = ed.GetDouble(zMinLevelO);
            if (zMinLevel.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
            else
            {
                zMinOld = zMinLevel.Value;
            }

            Utils.Utils.SetUCS(zMinLevel.Value);

            // Try to draw polygon for selected room
            PromptPointOptions ptOptions = new PromptPointOptions("Select point ");
            ptOptions.AllowNone = false;
            PromptPointResult ptResult = ed.GetPoint(ptOptions);

            if (ptResult.Status != PromptStatus.OK)
                return;

            DBObjectCollection collection = ed.TraceBoundary(ptResult.Value, true);

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Block table record for read
                BlockTable acBlkTbl;
                acBlkTbl = acTrans.GetObject(acCurDb.BlockTableId, OpenMode.ForRead) as BlockTable;

                // Open the Block table record Model space for write
                BlockTableRecord acBlkTblRec;
                acBlkTblRec = acTrans.GetObject(acBlkTbl[BlockTableRecord.ModelSpace], OpenMode.ForWrite) as BlockTableRecord;

                int noVertices = 0;
                Polyline polyLine = new Polyline();
                double xExt = 0, yExt = 0;

                foreach (DBObject obj in collection)
                {
                    Polyline ent = obj as Polyline;
                    if (ent != null)
                    {
                        // Check nouber of vertices
                        if (noVertices < ent.NumberOfVertices)
                        {
                            //make the color as red.
                            ent.ColorIndex = 1;
                            xExt = ent.GeometricExtents.MaxPoint.X - ent.GeometricExtents.MinPoint.X;
                            yExt = ent.GeometricExtents.MaxPoint.Y - ent.GeometricExtents.MinPoint.Y;
                            polyLine = ent;
                        }
                        else if (noVertices == ent.NumberOfVertices)
                        {
                            // Case for 4 vertices
                            // if the same number of vertices - check geom extent - which is grater
                            if (xExt < ent.GeometricExtents.MaxPoint.X - ent.GeometricExtents.MinPoint.X && yExt < ent.GeometricExtents.MaxPoint.Y - ent.GeometricExtents.MinPoint.Y)
                            {
                                ent.ColorIndex = 1;
                                xExt = ent.GeometricExtents.MaxPoint.X - ent.GeometricExtents.MinPoint.X;
                                yExt = ent.GeometricExtents.MaxPoint.Y - ent.GeometricExtents.MinPoint.Y;
                                polyLine = ent;
                            }
                        }
                    }
                }
                acBlkTblRec.AppendEntity(polyLine);
                acTrans.AddNewlyCreatedDBObject(polyLine, true);
                acTrans.Commit();
            }
            Utils.Utils.End();
        }


    }
}
