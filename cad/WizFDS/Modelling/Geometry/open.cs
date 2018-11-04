#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Teigha.BoundaryRepresentation;
using Teigha.DatabaseServices;
using Bricscad.EditorInput;
using Teigha.Geometry;
using Teigha.Runtime;
using BrFace = Teigha.BoundaryRepresentation.Face;
using BrException = Teigha.BoundaryRepresentation.Exception;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.BoundaryRepresentation;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
using BrFace = Autodesk.AutoCAD.BoundaryRepresentation.Face;
using BrException = Autodesk.AutoCAD.BoundaryRepresentation.Exception;
#endif

using System.Collections.Generic;

namespace WizFDS.Modelling.Geometry
{
    public class Open
    {
        double zMinOld = 0.0;
        double zMaxOld = 3.0;
        double heightOld = 3.0;

        [CommandMethod("fOPEN")]
        public void fOPEN()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Utils.Utils.Init();

                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                while (true)
                {
                    PromptSelectionOptions options = new PromptSelectionOptions();
                    options.SingleOnly = true;
                    options.SinglePickInSpace = true;

                    // Request for objects to be selected in the drawing area
                    PromptSelectionResult acSSPrompt = acDoc.Editor.GetSelection(options);

                    // If the prompt status is OK, objects were selected
                    if (acSSPrompt.Status != PromptStatus.OK || acSSPrompt.Status == PromptStatus.Cancel) { Utils.Utils.End(); return; }
                    if (acSSPrompt.Status == PromptStatus.OK)
                    {
                        SelectionSet acSSet = acSSPrompt.Value;

                        // Step through the objects in the selection set
                        SelectedObject acSSObj = acSSet[0];

                        // Check to make sure a valid SelectedObject object was returned
                        if (acSSObj != null)
                        {
                            // Open the selected object for write
                            Entity acEnt = null;
                            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                            {
                                acEnt = acTrans.GetObject(acSSObj.ObjectId, OpenMode.ForRead) as Entity;
                                acEnt.Unhighlight();
                                acEnt.Highlight();
                            }
                            if (acEnt.Layer.Contains("!FDS_MESH"))
                            {
                                PromptKeywordOptions axisOptions = new PromptKeywordOptions("\nChoose opening axis");
                                axisOptions.Keywords.Add("X-axis");
                                axisOptions.Keywords.Add("Y-axis");
                                axisOptions.Keywords.Add("Z-axis");
                                axisOptions.Keywords.Add("All");
                                axisOptions.AllowNone = false;
                                PromptResult axis = ed.GetKeywords(axisOptions);

                                if (axis.Status != PromptStatus.OK || axis.Status == PromptStatus.Cancel) { Utils.Utils.End(); return; };
                                if (axis.Status == PromptStatus.OK)
                                {
                                    if (axis.StringResult == "X-axis")
                                    {
                                        PromptKeywordOptions directionOptions = new PromptKeywordOptions("\nChoose direction");
                                        directionOptions.Keywords.Add("mIn");
                                        directionOptions.Keywords.Add("mAx");
                                        directionOptions.Keywords.Add("Both");
                                        directionOptions.AllowNone = false;
                                        PromptResult direction = ed.GetKeywords(directionOptions);
                                        if (direction.Status != PromptStatus.OK || direction.Status == PromptStatus.Cancel) { Utils.Utils.End(); return; };
                                        if (direction.Status == PromptStatus.OK)
                                        {
                                            Extents3d ext = acEnt.GeometricExtents;
                                            if (direction.StringResult == "mIn")
                                            {
                                                acEnt.Unhighlight();
                                                Utils.Utils.CreateExtrudedSurface(ext.MinPoint, new Point3d(ext.MinPoint.X, ext.MaxPoint.Y, ext.MaxPoint.Z), "!FDS_MESH[open]", 1, 1);
                                            }
                                            else if (direction.StringResult == "mAx")
                                            {
                                                acEnt.Unhighlight();
                                                Utils.Utils.CreateExtrudedSurface(new Point3d(ext.MaxPoint.X, ext.MinPoint.Y, ext.MinPoint.Z), ext.MaxPoint, "!FDS_MESH[open]", 1, 1);
                                            }
                                            else if (direction.StringResult == "Both")
                                            {
                                                acEnt.Unhighlight();
                                                Utils.Utils.CreateExtrudedSurface(ext.MinPoint, new Point3d(ext.MinPoint.X, ext.MaxPoint.Y, ext.MaxPoint.Z), "!FDS_MESH[open]", 1, 1);
                                                Utils.Utils.CreateExtrudedSurface(new Point3d(ext.MaxPoint.X, ext.MinPoint.Y, ext.MinPoint.Z), ext.MaxPoint, "!FDS_MESH[open]", 1, 1);
                                            }
                                        }
                                    }
                                    else if (axis.StringResult == "Y-axis")
                                    {
                                        PromptKeywordOptions directionOptions = new PromptKeywordOptions("\nChoose direction");
                                        directionOptions.Keywords.Add("mIn");
                                        directionOptions.Keywords.Add("mAx");
                                        directionOptions.Keywords.Add("Both");
                                        directionOptions.AllowNone = false;
                                        PromptResult direction = ed.GetKeywords(directionOptions);
                                        if (direction.Status != PromptStatus.OK || direction.Status == PromptStatus.Cancel) { Utils.Utils.End(); return; };
                                        if (direction.Status == PromptStatus.OK)
                                        {
                                            Extents3d ext = acEnt.GeometricExtents;
                                            if (direction.StringResult == "mIn")
                                            {
                                                acEnt.Unhighlight();
                                                Utils.Utils.CreateExtrudedSurface(ext.MinPoint, new Point3d(ext.MaxPoint.X, ext.MinPoint.Y, ext.MaxPoint.Z), "!FDS_MESH[open]", 1, 1);
                                            }
                                            else if (direction.StringResult == "mAx")
                                            {
                                                acEnt.Unhighlight();
                                                Utils.Utils.CreateExtrudedSurface(new Point3d(ext.MinPoint.X, ext.MaxPoint.Y, ext.MinPoint.Z), ext.MaxPoint, "!FDS_MESH[open]", 1, 1);
                                            }
                                            else if (direction.StringResult == "Both")
                                            {
                                                acEnt.Unhighlight();
                                                Utils.Utils.CreateExtrudedSurface(ext.MinPoint, new Point3d(ext.MaxPoint.X, ext.MinPoint.Y, ext.MaxPoint.Z), "!FDS_MESH[open]", 1, 1);
                                                Utils.Utils.CreateExtrudedSurface(new Point3d(ext.MinPoint.X, ext.MaxPoint.Y, ext.MinPoint.Z), ext.MaxPoint, "!FDS_MESH[open]", 1, 1);
                                            }
                                        }

                                    }
                                    else if (axis.StringResult == "Z-axis")
                                    {
                                        PromptKeywordOptions directionOptions = new PromptKeywordOptions("\nChoose direction");
                                        directionOptions.Keywords.Add("mIn");
                                        directionOptions.Keywords.Add("mAx");
                                        directionOptions.Keywords.Add("Both");
                                        directionOptions.AllowNone = false;
                                        PromptResult direction = ed.GetKeywords(directionOptions);
                                        if (direction.Status != PromptStatus.OK || direction.Status == PromptStatus.Cancel) { Utils.Utils.End(); return; };
                                        if (direction.Status == PromptStatus.OK)
                                        {
                                            Extents3d ext = acEnt.GeometricExtents;
                                            if (direction.StringResult == "mIn")
                                            {
                                                acEnt.Unhighlight();
                                                Utils.Utils.CreateExtrudedSurface(ext.MinPoint, new Point3d(ext.MaxPoint.X, ext.MaxPoint.Y, ext.MinPoint.Z), "!FDS_MESH[open]", 1, 1);
                                            }
                                            else if (direction.StringResult == "mAx")
                                            {
                                                acEnt.Unhighlight();
                                                Utils.Utils.CreateExtrudedSurface(new Point3d(ext.MinPoint.X, ext.MinPoint.Y, ext.MaxPoint.Z), ext.MaxPoint, "!FDS_MESH[open]", 1, 1);
                                            }
                                            else if (direction.StringResult == "Both")
                                            {
                                                acEnt.Unhighlight();
                                                Utils.Utils.CreateExtrudedSurface(ext.MinPoint, new Point3d(ext.MaxPoint.X, ext.MaxPoint.Y, ext.MinPoint.Z), "!FDS_MESH[open]", 1, 1);
                                                Utils.Utils.CreateExtrudedSurface(new Point3d(ext.MinPoint.X, ext.MinPoint.Y, ext.MaxPoint.Z), ext.MaxPoint, "!FDS_MESH[open]", 1, 1);
                                            }
                                        }
                                    }
                                    else if (axis.StringResult == "All")
                                    {
                                        Extents3d ext = acEnt.GeometricExtents;
                                        acEnt.Unhighlight();

                                        Utils.Utils.CreateExtrudedSurface(ext.MinPoint, new Point3d(ext.MinPoint.X, ext.MaxPoint.Y, ext.MaxPoint.Z), "!FDS_MESH[open]", 1, 1);
                                        Utils.Utils.CreateExtrudedSurface(new Point3d(ext.MaxPoint.X, ext.MinPoint.Y, ext.MinPoint.Z), ext.MaxPoint, "!FDS_MESH[open]", 1, 1);

                                        Utils.Utils.CreateExtrudedSurface(ext.MinPoint, new Point3d(ext.MaxPoint.X, ext.MinPoint.Y, ext.MaxPoint.Z), "!FDS_MESH[open]", 1, 1);
                                        Utils.Utils.CreateExtrudedSurface(new Point3d(ext.MinPoint.X, ext.MaxPoint.Y, ext.MinPoint.Z), ext.MaxPoint, "!FDS_MESH[open]", 1, 1);

                                        Utils.Utils.CreateExtrudedSurface(ext.MinPoint, new Point3d(ext.MaxPoint.X, ext.MaxPoint.Y, ext.MinPoint.Z), "!FDS_MESH[open]", 1, 1);
                                        Utils.Utils.CreateExtrudedSurface(new Point3d(ext.MinPoint.X, ext.MinPoint.Y, ext.MaxPoint.Z), ext.MaxPoint, "!FDS_MESH[open]", 1, 1);

                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("Program error: " + e.ToString());
                Utils.Utils.End();
                return;
            }

        }

        [CommandMethod("fOPENVISUAL")]
        public void fOPENVISUAL()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Document doc = acApp.DocumentManager.MdiActiveDocument;
                Database db = doc.Database;

                Utils.Utils.Init();
                Utils.Utils.ChangeViewStyle("X-Ray");

                while (true)
                {
                    PromptEntityOptions peo = new PromptEntityOptions("\nSelect mesh face:");
                    peo.SetRejectMessage("\nMust be a 3D solid.");
                    peo.AddAllowedClass(typeof(Solid3d), false);
                    PromptEntityResult per = ed.GetEntity(peo);
                    if (per.Status != PromptStatus.OK || per.Status == PromptStatus.Cancel)
                    {
                        Utils.Utils.End();
                        break;
                    }

                    Transaction tr = db.TransactionManager.StartTransaction();
                    using (tr)
                    {
                        Solid3d sol = tr.GetObject(per.ObjectId, OpenMode.ForRead) as Solid3d;
                        if (sol != null)
                        {
                            Brep brp = new Brep(sol);
                            using (brp)
                            {
                                // We're going to check interference between our
                                // solid and a line we're creating between the
                                // picked point and the user (we use the view
                                // direction to decide in which direction to
                                // draw the line)

                                Point3d dir = (Point3d)acApp.GetSystemVariable("VIEWDIR");
                                Point3d picked = per.PickedPoint, nearerUser = per.PickedPoint - (dir - Point3d.Origin);

                                // Two hits should be enough (in and out)
                                const int numHits = 1;

                                // Create out line
                                Line3d ln = new Line3d(picked, nearerUser);
                                Hit[] hits = brp.GetLineContainment(ln, numHits);
                                ln.Dispose();

                                if (hits == null || hits.Length < numHits)
                                {
                                    Utils.Utils.End();
                                    return;
                                }

                                // Set the shortest distance to something large
                                // and the index to the first item in the list
                                double shortest = (picked - nearerUser).Length;
                                int found = 0;

                                // Loop through and check the distance to the
                                // user (the depth of field).
                                for (int idx = 0; idx < numHits; idx++)
                                {
                                    Hit hit = hits[idx];
                                    double dist = (hit.Point - nearerUser).Length;
                                    if (dist < shortest)
                                    {
                                        shortest = dist;
                                        found = idx;
                                    }
                                }

                                // Once we have the nearest point to the screen,
                                // use that one to get the containing curves
                                //List<Curve3d> curves = new List<Curve3d>();
                                List<Point3d> faceBoundary = new List<Point3d>();

                                if (CheckContainment(ed, brp, hits[found].Point, ref faceBoundary))
                                {
                                    Utils.Layers.SetLayer("!FDS_MESH[open]");

                                    if (faceBoundary[0].X == faceBoundary[1].X)
                                    {
                                        if (faceBoundary[0].X == sol.GeometricExtents.MinPoint.X)
                                            Utils.Utils.CreateExtrudedSurface(faceBoundary[0], new Point3d(faceBoundary[1].X, faceBoundary[1].Y, faceBoundary[1].Z), "!FDS_MESH[open]", 1, 1);
                                        else if (faceBoundary[0].X == sol.GeometricExtents.MaxPoint.X)
                                            Utils.Utils.CreateExtrudedSurface(faceBoundary[0], new Point3d(faceBoundary[1].X, faceBoundary[1].Y, faceBoundary[1].Z), "!FDS_MESH[open]", 1, 1);
                                    }
                                    else if (faceBoundary[0].Y == faceBoundary[1].Y)
                                    {
                                        if (faceBoundary[0].Y == sol.GeometricExtents.MinPoint.Y)
                                            Utils.Utils.CreateExtrudedSurface(faceBoundary[0], new Point3d(faceBoundary[1].X, faceBoundary[1].Y, faceBoundary[1].Z), "!FDS_MESH[open]", 1, 1);
                                        else if (faceBoundary[0].Y == sol.GeometricExtents.MaxPoint.Y)
                                            Utils.Utils.CreateExtrudedSurface(faceBoundary[0], new Point3d(faceBoundary[1].X, faceBoundary[1].Y, faceBoundary[1].Z), "!FDS_MESH[open]", 1, 1);
                                    }
                                    if (faceBoundary[0].Z == faceBoundary[1].Z)
                                    {
                                        if (faceBoundary[0].Z == sol.GeometricExtents.MinPoint.Z)
                                            Utils.Utils.CreateExtrudedSurface(faceBoundary[0], new Point3d(faceBoundary[1].X, faceBoundary[1].Y, faceBoundary[1].Z), "!FDS_MESH[open]", 1, 1);
                                        else if (faceBoundary[0].Z == sol.GeometricExtents.MaxPoint.Z)
                                            Utils.Utils.CreateExtrudedSurface(faceBoundary[0], new Point3d(faceBoundary[1].X, faceBoundary[1].Y, faceBoundary[1].Z), "!FDS_MESH[open]", 1, 1);
                                    }
                                }
                            }
                        }
                        tr.Commit();
                    }
                }
                Utils.Utils.End();
                Utils.Utils.ChangeViewStyle("2dWireframe");
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("Program error: " + e.ToString());
                Utils.Utils.End();
                return;
            }
        }
        private static bool CheckContainment(Editor ed, Brep brp, Point3d pt, ref List<Point3d> faceBoundary)
        {
            bool res = false;
            // Use the BRep API to get the lowest level
            // container for the point
            PointContainment pc;
            BrepEntity be = brp.GetPointContainment(pt, out pc);
            using (be)
            {
                // Only if the point is on a boundary...
                if (pc == PointContainment.OnBoundary)
                {
                    // And only if the boundary is a face...
                    BrFace face = be as BrFace;
                    if (face != null)
                    {
                        // ... do we attempt to do something
                        try
                        {
#if BRX_APP
                            //faceBoundary.Add(face.BoundBlock.GetMinimumPoint());
                            //faceBoundary.Add(face.BoundBlock.GetMaximumPoint());
                            res = true;
#elif ARX_APP
                            faceBoundary.Add(face.BoundBlock.GetMinimumPoint());
                            faceBoundary.Add(face.BoundBlock.GetMaximumPoint());
                            res = true;
#endif
                        }
                        catch (BrException)
                        {
                            res = false;
                        }
                    }
                }
            }
            return res;
        }

        [CommandMethod("fOPENMANUAL")]
        public void fOPENMANUAL()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Utils.Utils.Init();
                Utils.Layers.SetLayer("!FDS_MESH[open]");

                while (true)
                {
                    PromptKeywordOptions orientationOptions = new PromptKeywordOptions("\nChoose vent open orientation");
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
                                PromptDoubleOptions zMinOption = new PromptDoubleOptions("Enter vent open Z-min level");
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
                                    PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter vent open Z-max level or ");
                                    zMaxO.DefaultValue = zMaxOld;
                                    zMaxO.Keywords.Add("Height");
                                    zMax = ed.GetDouble(zMaxO);
                                    if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                                    {
                                        PromptDoubleOptions heightO = new PromptDoubleOptions("\nEnter vent open height:");
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
                                    PromptPointOptions p1Option = new PromptPointOptions("\nSpecify vent open first corner:");
                                    p1Option.AllowNone = false;
                                    PromptPointResult p1 = ed.GetPoint(p1Option);
                                    if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto End;

                                    PromptPointOptions p2Option = new PromptPointOptions("\nSpecify vent open second corner:");
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
                                PromptDoubleOptions zlevelOption = new PromptDoubleOptions("Enter vent open Z level");
                                zlevelOption.AllowNone = false;
                                zlevelOption.DefaultValue = zMinOld;
                                PromptDoubleResult zlevel = ed.GetDouble(zlevelOption);
                                if (zlevel.Status != PromptStatus.OK || zlevel.Status == PromptStatus.Cancel) goto End;
                                zMinOld = zlevel.Value;
                                Utils.Utils.SetUCS(zlevel.Value);

                                Utils.Utils.SetOrtho(false);

                                while (true)
                                {
                                    PromptPointOptions p1Option = new PromptPointOptions("\nSpecify vent open first corner:");
                                    p1Option.AllowNone = false;
                                    PromptPointResult p1 = ed.GetPoint(p1Option);
                                    if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto End;

                                    var p2 = ed.GetUcsCorner("Pick vent open opposite corner:", p1.Value);
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
    }
}
