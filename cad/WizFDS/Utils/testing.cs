using System.Collections.Generic;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Runtime;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.GraphicsInterface;
using Autodesk.AutoCAD.BoundaryRepresentation;
using BrFace = Autodesk.AutoCAD.BoundaryRepresentation.Face;
using BrException = Autodesk.AutoCAD.BoundaryRepresentation.Exception;
using System.Runtime.InteropServices;
using System;

namespace wizFDS
{
    public class test
    {

        [CommandMethod("xx")]
        public void xx()
        {

            Utils.Init();
            Utils.InitCfast();
            Utils.CreateBox(0, 4, 0, 0.2, 0, 3, "!FDS_OBST[inert](0)");
            Utils.CreateBox(-0.2, 0, 0, 4, 0, 3, "!FDS_OBST[inert](0)");
            Utils.CreateBox(-1, 5, -2, 8, 0, 3.6, "!FDS_MESH");
            Utils.CreateExtrudedSurface(new Point3d(2, 2, 2), new Point3d(2, 2.4, 2.2), "!FDS_VENT[vent]");
            Utils.CreateExtrudedSurface(new Point3d(4, -2.4, 0), new Point3d(4, 8.4, 3.0), "!FDS_SLCF[slice]");

            Utils.ZoomInit();

        }


        public static Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;

        // Keep a list of trhe things we've drawn
        // so we can undraw them
        List<Drawable> _drawn = new List<Drawable>();
        [CommandMethod("yy")]
        public void PickFace()
        {
            try
            {
                Document doc = Application.DocumentManager.MdiActiveDocument;
                Database db = doc.Database;
                Editor ed = doc.Editor;

                Utils.Init();
                Utils.ChangeViewStyle("Hidden");

                while (true)
                {
                    //ClearDrawnGraphics();
                    PromptEntityOptions peo = new PromptEntityOptions("\nSelect face of solid:");
                    peo.SetRejectMessage("\nMust be a 3D solid.");
                    peo.AddAllowedClass(typeof(Solid3d), false);
                    PromptEntityResult per = ed.GetEntity(peo);
                    if (per.Status != PromptStatus.OK || per.Status == PromptStatus.Cancel)
                    {
                        Utils.End();
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

                                Point3d dir = (Point3d)Application.GetSystemVariable("VIEWDIR");
                                Point3d picked = per.PickedPoint, nearerUser = per.PickedPoint - (dir - Point3d.Origin);

                                // Two hits should be enough (in and out)
                                const int numHits = 1;

                                // Create out line
                                Line3d ln = new Line3d(picked, nearerUser);
                                Hit[] hits = brp.GetLineContainment(ln, numHits);
                                ln.Dispose();

                                if (hits == null || hits.Length < numHits)
                                {
                                    Utils.End();
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
                                    Utils.SetLayer("!FDS_MESH[open]");


                                    //Utils.CreateSurfaceinDB(faceBoundary[0], faceBoundary[1], faceBoundary[0].X, "X");
                                    if (faceBoundary[0].X == faceBoundary[1].X)
                                    {
                                        if (faceBoundary[0].X == sol.GeometricExtents.MinPoint.X)
                                            Utils.CreateBox(faceBoundary[0], new Point3d(faceBoundary[1].X - 0.01, faceBoundary[1].Y, faceBoundary[1].Z));
                                        else if (faceBoundary[0].X == sol.GeometricExtents.MaxPoint.X)
                                            Utils.CreateBox(faceBoundary[0], new Point3d(faceBoundary[1].X + 0.01, faceBoundary[1].Y, faceBoundary[1].Z));
                                    }
                                    //Utils.CreateSurfaceinDB(faceBoundary[0], faceBoundary[1], faceBoundary[0].Y, "Y");
                                    else if (faceBoundary[0].Y == faceBoundary[1].Y)
                                    {
                                        if (faceBoundary[0].Y == sol.GeometricExtents.MinPoint.Y)
                                            Utils.CreateBox(faceBoundary[0], new Point3d(faceBoundary[1].X, faceBoundary[1].Y - 0.01, faceBoundary[1].Z));
                                        else if (faceBoundary[0].Y == sol.GeometricExtents.MaxPoint.Y)
                                            Utils.CreateBox(faceBoundary[0], new Point3d(faceBoundary[1].X, faceBoundary[1].Y + 0.01, faceBoundary[1].Z));
                                    }
                                    if (faceBoundary[0].Z == faceBoundary[1].Z)
                                    {
                                        if (faceBoundary[0].Z == sol.GeometricExtents.MinPoint.Z)
                                            Utils.CreateBox(faceBoundary[0], new Point3d(faceBoundary[1].X, faceBoundary[1].Y, faceBoundary[1].Z - 0.01));
                                        else if (faceBoundary[0].Z == sol.GeometricExtents.MaxPoint.Z)
                                            Utils.CreateBox(faceBoundary[0], new Point3d(faceBoundary[1].X, faceBoundary[1].Y, faceBoundary[1].Z + 0.01));
                                    }
                                    //    Utils.CreateSurfaceinDB(faceBoundary[0], faceBoundary[1], faceBoundary[0].Z, "Z");
                                    // If we get some back, get drawables for them and
                                    // pass them through to the transient graphics API


                                    //TransientManager tm = TransientManager.CurrentTransientManager;
                                    //IntegerCollection ic = new IntegerCollection();


                                    //foreach (Curve3d curve in curves)
                                    //{
                                    //    ed.WriteMessage("\nCurve start: " + curve.StartPoint.ToString());
                                    //    ed.WriteMessage("\nCurve end: " + curve.EndPoint.ToString());
                                    //    Drawable d = GetDrawable(curve);
                                    //    tm.AddTransient(d, TransientDrawingMode.DirectTopmost, 0, ic);
                                    //    _drawn.Add(d);
                                    //}
                                }
                            }
                        }
                        tr.Commit();
                    }
                }
                Utils.End();
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("Program error: " + e.ToString());
                Utils.End();
                return;
            }
        }

        private void ClearDrawnGraphics()

        {

            // Clear any graphics we've drawn with the transient

            // graphics API, then clear the list

            TransientManager tm =

              TransientManager.CurrentTransientManager;

            IntegerCollection ic = new IntegerCollection();

            foreach (Drawable d in _drawn)

            {

                tm.EraseTransient(d, ic);

            }

            _drawn.Clear();

        }

        private Drawable GetDrawable(Curve3d curve)

        {

            // We could support multiple curve types here, but for

            // now let's just return a line approximating it

            Line ln = new Line(curve.StartPoint, curve.EndPoint);

            ln.ColorIndex = 1;

            return ln;

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
                            faceBoundary.Add(face.BoundBlock.GetMinimumPoint());
                            faceBoundary.Add(face.BoundBlock.GetMaximumPoint());
                            res = true;
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






    }
}
