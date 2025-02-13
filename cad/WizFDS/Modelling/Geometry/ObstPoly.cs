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
#elif GRX_APP
using acApp = Gssoft.Gscad.ApplicationServices.Application;
using Gssoft.Gscad.ApplicationServices;
using Gssoft.Gscad.DatabaseServices;
using Gssoft.Gscad.EditorInput;
using Gssoft.Gscad.Runtime;
using Gssoft.Gscad.Geometry;
#endif


namespace WizFDS.Modelling.Geometry
{
    public class BulgePolyJig : EntityJig
    {
        static double zMinOld = 0;
        static double zMaxOld = 3;
        static double heightOld = 3;
        Point3d _tempPoint;
        Plane _plane;
        bool _isUndoing = false;
        Matrix3d _ucs;
        Document acDoc = acApp.DocumentManager.MdiActiveDocument;
        public Polyline pline = new Polyline();

        public BulgePolyJig(Matrix3d ucs) : base(new Polyline())
        {
            _ucs = ucs;

            // Get the coordinate system for the UCS passed in, and
            // create a plane with the same normal (but we won't use
            // the same origin)
            CoordinateSystem3d cs = ucs.CoordinateSystem3d;
            Vector3d normal = cs.Zaxis;
            _plane = new Plane(Point3d.Origin, normal);

            // Access our polyline and set its normal
            pline.SetDatabaseDefaults();
            pline.Normal = normal;
            ObjectId plineId = pline.ObjectId;

            // Check the distance from the plane to the coordinate
            // system's origin (wwe could use Plane.DistanceTo(), but
            // then we also need the vector to determine whether it is
            // co-directional with the normal)
            Point3d closest = cs.Origin.Project(_plane, normal);
            Vector3d disp = closest - cs.Origin;

            // Set the elevation based on the direction of the vector
            pline.Elevation = disp.IsCodirectionalTo(normal) ? -disp.Length : disp.Length;
            AddDummyVertex();
        }

        protected override SamplerStatus Sampler(JigPrompts prompts)
        {
            JigPromptPointOptions jigOpts = new JigPromptPointOptions();

            jigOpts.UserInputControls =
              (UserInputControls.Accept3dCoordinates |
               UserInputControls.NullResponseAccepted |
               UserInputControls.NoNegativeResponseAccepted |
               UserInputControls.GovernedByOrthoMode);

            _isUndoing = false;

            Polyline pline = Entity as Polyline;

            if (pline.NumberOfVertices == 1)
            {
                // For the first vertex, just ask for the point
                jigOpts.Message = "\nSpecify start point: ";
            }
            else if (pline.NumberOfVertices > 1)
            {
                string msgAndKwds = ("\nSpecify next point or [Undo]: ");
                string kwds = ("Undo");
                jigOpts.SetMessageAndKeywords(msgAndKwds, kwds);
            }
            else
                return SamplerStatus.Cancel; // Should never happen

            // Get the point itself
            PromptPointResult res = prompts.AcquirePoint(jigOpts);
            if (res.Status == PromptStatus.Keyword)
            {
                if (res.StringResult.ToUpper() == "UNDO")
                    _isUndoing = true;
                return SamplerStatus.OK;
            }
            else if (res.Status == PromptStatus.OK)
            {
                // Check if it has changed or not (reduces flicker)
                if (_tempPoint == res.Value)
                    return SamplerStatus.NoChange;
                else
                {
                    _tempPoint = res.Value;
                    return SamplerStatus.OK;
                }
            }
            return SamplerStatus.Cancel;
        }

        // Funkcje do rysowani polilinii ...
        protected override bool Update()
        {
            // Update the dummy vertex to be our 3D point
            // projected onto our plane
            Polyline pl = Entity as Polyline;
            if (pl.NumberOfVertices > 1)
                pl.SetBulgeAt(pl.NumberOfVertices - 2, 0);

            pl.SetPointAt(pl.NumberOfVertices - 1, _tempPoint.Convert2d(_plane));
            return true;
        }
        public bool IsUndoing
        {
            get
            {
                return _isUndoing;
            }
        }
        public void AddDummyVertex()
        {
            // Create a new dummy vertex... can have any initial value
            Polyline pline = Entity as Polyline;
            pline.AddVertexAt(pline.NumberOfVertices, new Point2d(0, 0), 0, 0, 0);
        }
        public void RemoveLastVertex()
        {
            Polyline pline = Entity as Polyline;
            // Let's first remove our dummy vertex   
            if (pline.NumberOfVertices > 1)
                pline.RemoveVertexAt(pline.NumberOfVertices - 1);
        }
        public void Append()
        {
            Database db = HostApplicationServices.WorkingDatabase;
            Transaction tr = db.TransactionManager.StartTransaction();

            using (tr)
            {
                BlockTable bt = tr.GetObject(db.BlockTableId, OpenMode.ForRead) as BlockTable;
                BlockTableRecord btr = tr.GetObject(bt[BlockTableRecord.ModelSpace], OpenMode.ForWrite) as BlockTableRecord;

                btr.AppendEntity(this.Entity);
                tr.AddNewlyCreatedDBObject(this.Entity, true);
                tr.Commit();
            }
        }
        IExtensionApplication Implements;

        public void Initialize()
        {
            Implements.Initialize();
            SystemObjects.DynamicLinker.LoadModule("AcMPolygonObj"+ acApp.Version.Major + ".dbx", false, false);

        }
        public void Terminate()
        {
            Implements.Terminate();
        }

#if ARX_APP
        // fWALL
        public void ExtrudeWall(double zmin, double zmax, double height)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            // TODO: poprawic narozniki w przypadku prostopadlych scian
            //       skosy - moglyby byc po zewnetrznej stronie
            try
            {
                Polyline pline = Entity as Polyline;
                Point3dCollection points = new Point3dCollection();
                pline.GetStretchPoints(points);
                MPolygonLoop mPolyLoop = new MPolygonLoop();

                for (int i = 0; i <= pline.NumberOfVertices - 1; i++)
                {
                    mPolyLoop.Add(new BulgeVertex(new Point2d(points[i].X, points[i].Y), 0));
                }
                // Dodaje na koncu poczatek polilini tak zeby zamknac
                mPolyLoop.Add(new BulgeVertex(new Point2d(points[0].X, points[0].Y), 0));
                MPolygon mPoly = new MPolygon();
                mPoly.AppendMPolygonLoop(mPolyLoop, false, 0);

                for (int i = 0; i < pline.NumberOfVertices - 1; i++)
                {
                    Point3d middle = new Point3d();
                    if (points[i].X == points[i + 1].X)
                        middle = new Point3d(points[i].X + Utils.Utils.snapUnit.X, (points[i].Y + points[i + 1].Y) / 2, points[i].Z);
                    else if (points[i].Y == points[i + 1].Y)
                        middle = new Point3d((points[i].X + points[i + 1].X) / 2, points[i].Y + Utils.Utils.snapUnit.Y, points[i].Z);
                    else
                        middle = new Point3d((points[i].X + points[i + 1].X / 2) + Utils.Utils.snapUnit.X, (points[i].Y + points[i + 1].Y / 2) + Utils.Utils.snapUnit.Y, points[i].Z);

                    if (mPoly.IsPointInsideMPolygon(middle, 0).Count == 1)
                    {
                        if (points[i].X == points[i + 1].X)
                            Utils.Utils.CreateBox(points[i].X, points[i + 1].X - Utils.Utils.snapUnit.X, points[i].Y, points[i + 1].Y, zmin, zmax);
                        else if (points[i].Y == points[i + 1].Y)
                            Utils.Utils.CreateBox(points[i].X, points[i + 1].X, points[i].Y, points[i + 1].Y - Utils.Utils.snapUnit.Y, zmin, zmax);
                        else
                            Utils.Utils.Bresenham(points[i].X, points[i].Y, points[i + 1].X, points[i + 1].Y, height, zmin);
                    }
                    else if (mPoly.IsPointInsideMPolygon(middle, 0).Count == 0)
                    {
                        if (points[i].X == points[i + 1].X)
                            Utils.Utils.CreateBox(points[i].X, points[i + 1].X + Utils.Utils.snapUnit.X, points[i].Y, points[i + 1].Y, zmin, zmax);
                        else if (points[i].Y == points[i + 1].Y)
                            Utils.Utils.CreateBox(points[i].X, points[i + 1].X, points[i].Y, points[i + 1].Y + Utils.Utils.snapUnit.Y, zmin, zmax);
                        else
                            Utils.Utils.Bresenham(points[i].X, points[i].Y, points[i + 1].X, points[i + 1].Y, height, zmin);
                    }
                }
                // Usun polilinie
                Utils.Utils.DeleteObject(pline.ObjectId);
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("Program exception: " + e.ToString());
            }

        }

        [CommandMethod("fWall")]
        public static void fWall()
        {
            Utils.Utils.Init();
            Document doc = acApp.DocumentManager.MdiActiveDocument;
            Database db = doc.Database;
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;

            BulgePolyJig jig = new BulgePolyJig(ed.CurrentUserCoordinateSystem);

            // Get zMin & zMax | height level
            PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter Z-min level:");
            zMinO.DefaultValue = zMinOld;
            PromptDoubleResult zMin = ed.GetDouble(zMinO);
            if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
            zMinOld = zMin.Value;
            Utils.Utils.SetUCS(zMin.Value);

            if (!Utils.Layers.CurrentLayer().Contains("OBST")) Utils.Layers.SetLayerForCurrentFloor("!FDS_OBST[gypsum_board]");

            double height;
            PromptDoubleResult zMax;
            PromptDoubleResult heightResult;
            // Enter Z-max (and check if > Z-min) or Height 
            while (true)
            {
                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter Z-max level or ");
                zMaxO.DefaultValue = zMaxOld;
                zMaxO.Keywords.Add("Height");
                zMax = ed.GetDouble(zMaxO);
                if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                {
                    PromptDoubleOptions heightO = new PromptDoubleOptions("\nEnter height:");
                    heightO.DefaultValue = heightOld;
                    heightO.AllowNone = false;
                    heightO.AllowZero = false;
                    heightO.AllowNegative = false;
                    heightResult = ed.GetDouble(heightO);
                    if(heightResult.Status == PromptStatus.OK)
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
                PromptResult res = ed.Drag(jig);
                switch (res.Status)
                {
                    // New point was added, keep going
                    case PromptStatus.OK:
                        jig.AddDummyVertex();
                        break;
                    // Keyword was entered
                    case PromptStatus.Keyword:
                        if (jig.IsUndoing)
                            jig.RemoveLastVertex();
                        break;
                    // If the jig completed successfully, add the polyline
                    case PromptStatus.None:
                        jig.RemoveLastVertex();
                        jig.Append();
                        // Wyciagniecie geometrii
                        jig.ExtrudeWall(zMin.Value, zMax.Value, height);
                        Utils.Utils.End();
                        return;
                    // User cancelled the command, get out of here
                    // and don't forget to dispose the jigged entity
                    default:
                        jig.Entity.Dispose();
                        Utils.Utils.End();
                        return;
                }
            }
        }
#endif

#if ARX_APP
        // fCWALL
        public void ExtrudeToCeiling(double zMin)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            // TODO znalezc dlaczego nie wyciaga scian na zewnatrz polygonu
            try
            {
                Polyline pline = Entity as Polyline;
                Point3dCollection points = new Point3dCollection();
                pline.GetStretchPoints(points);
                MPolygonLoop mPolyLoop = new MPolygonLoop();

                for (int i = 0; i <= pline.NumberOfVertices - 1; i++)
                {
                    mPolyLoop.Add(new BulgeVertex(new Point2d(points[i].X, points[i].Y), 0));
                }
                // Dodaje na koncu poczatek polilini tak zeby zamknac
                mPolyLoop.Add(new BulgeVertex(new Point2d(points[0].X, points[0].Y), 0));
                MPolygon mPoly = new MPolygon();
                mPoly.AppendMPolygonLoop(mPolyLoop, false, 0);

                List<Entity> obsts = new List<Entity>();

                // Start a transaction
                using (Transaction acTrans = acDoc.Database.TransactionManager.StartTransaction())
                {
                    // Request for objects to be selected in the drawing area
                    PromptSelectionResult acSSPrompt = acDoc.Editor.GetSelection();

                    // If the prompt status is OK, objects were selected
                    if (acSSPrompt.Status == PromptStatus.OK)
                    {
                        SelectionSet acSSet = acSSPrompt.Value;

                        foreach (SelectedObject acSSObj in acSSet)
                        {
                            // Check to make sure a valid SelectedObject object was returned
                            if (acSSObj != null)
                            {
                                // Open the selected object for write
                                Entity acEnt = acTrans.GetObject(acSSObj.ObjectId,
                                                                    OpenMode.ForRead) as Entity;
                                obsts.Add(acEnt);
                            }
                        }
                    }
                }
                CheckIntersection(pline, mPoly, obsts, zMin);
                // Usun polilinie
                Utils.Utils.DeleteObject(pline.ObjectId);
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("Program exception: " + e.ToString());
            }
        }
        public void CheckIntersection(Polyline pline, MPolygon mPoly, List<Entity> obsts, double zMin)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Point3dCollection plinePoints = new Point3dCollection();
            pline.GetStretchPoints(plinePoints);

            foreach (Entity acEnt in obsts)
            {
                ed.WriteMessage("\n\nNowy strop:");
                //ed.WriteMessage("\nWymiary: " + acEnt.GeometricExtents.ToString());
                //ed.WriteMessage("\nXdata:" + Xdata.LoadXData(acEnt.ObjectId));
                string tmpXdata = Utils.Xdata.LoadXData(acEnt.ObjectId);

                if (tmpXdata.Contains("verticalCeiling")){
                    ed.WriteMessage("\nJest Xdata: " + tmpXdata);
                    continue;
                }

                // Utworz prostokat i polilinie ze stropu do ktorego ma byc wyciagnieta narysowana polilinia
                Rect rObst = new Rect(new Point(acEnt.GeometricExtents.MinPoint.X, acEnt.GeometricExtents.MinPoint.Y), new Point(acEnt.GeometricExtents.MaxPoint.X, acEnt.GeometricExtents.MaxPoint.Y));
                Polyline pObst = new Polyline();
                pObst.AddVertexAt(0, new Point2d(acEnt.GeometricExtents.MinPoint.X, acEnt.GeometricExtents.MinPoint.Y), 0, 0, 0);
                pObst.AddVertexAt(1, new Point2d(acEnt.GeometricExtents.MaxPoint.X, acEnt.GeometricExtents.MinPoint.Y), 0, 0, 0);
                pObst.AddVertexAt(2, new Point2d(acEnt.GeometricExtents.MaxPoint.X, acEnt.GeometricExtents.MaxPoint.Y), 0, 0, 0);
                pObst.AddVertexAt(3, new Point2d(acEnt.GeometricExtents.MinPoint.X, acEnt.GeometricExtents.MaxPoint.Y), 0, 0, 0);
                pObst.AddVertexAt(4, new Point2d(acEnt.GeometricExtents.MinPoint.X, acEnt.GeometricExtents.MinPoint.Y), 0, 0, 0);

                // Sprawdz czy narysowana polilinia przecina sie ze stropem
                Point3dCollection pts = new Point3dCollection();
                pline.IntersectWith(pObst, Intersect.OnBothOperands, pts, IntPtr.Zero, IntPtr.Zero);
                //ed.WriteMessage("\nLiczba przeciec: " + pts.Count.ToString());
                
                // Ustaw parametry wyciagniecia sciany - narysowanej polilini
                double zmax = acEnt.GeometricExtents.MinPoint.Z;

                // Dodatkowa zmienna zabezpieczajaca przed ponownym narysowaniem lini ktore sa pod stropem ale sie nie przecinaja z nim
                bool drawn = false;
                bool drawn2 = false;

                if (pts.Count > 0)
                {
                    // Dla kazdego punktu przeciecia
                    for (int j = 0; j < pts.Count; j++)
                    {
                        //ed.WriteMessage("\nPoint:" + ptIntersection);
                        // Sprawdz wszystkie punkty narysowanej polilinii
                        for (int i = 0; i < pline.NumberOfVertices - 1; i++)
                        {
                            // Utworz linie pomiedzy 2 kolejnymi wierzcholkami
                            Line pSingleLine = new Line(pline.GetPoint3dAt(i), pline.GetPoint3dAt(i + 1));
                            Point3d p = pSingleLine.GetClosestPointTo(pts[j], false);
                            // Jezeli punkt lezy na lini - odleglosc od lini do punktu jest rowna 0
                            if ((p - pts[j]).Length <= Tolerance.Global.EqualPoint)
                            {
                                //ed.WriteMessage("\nPoints[i]: " + plinePoints[i].ToString());
                                //ed.WriteMessage("\npoint: " + pts[j].ToString());

                                //ed.WriteMessage("\nIndex i: " + i.ToString());
                                // Jezeli punkt narysowanej polilinii znajduje sie pod analizowanym stropem
                                if (rObst.Contains(new Point(plinePoints[i].X, plinePoints[i].Y)))
                                {
                                    CreateWall(mPoly, plinePoints[i], pts[j], zMin, zmax);
                                }
                                // Jezeli punkt narysowanej polilinii nie znajduje sie pod analizowanym stropem
                                else
                                {
                                    // Jezeli kolejny punkt narysowanej polilinii znajduje sie pod analizowanym stropem
                                    if (rObst.Contains(new Point(plinePoints[i + 1].X, plinePoints[i + 1].Y)))
                                    {
                                        CreateWall(mPoly, pts[j], plinePoints[i + 1], zMin, zmax);
                                    }
                                    // Jezeli kolejny punkt narysowanej polilinii nie znajduej sie pod analizowanym stropem
                                    else if (!rObst.Contains(new Point(plinePoints[i + 1].X, plinePoints[i + 1].Y)) && drawn2 == false)
                                    {
                                        CreateWall(mPoly, pts[j], pts[j + 1], zMin, zmax);
                                    }
                                }
                            }
                            // Jezeli punkt nie lezy na linii - linia jest narysowana wewnatrz obrysu stropu
                            else
                            {
                                // Jezeli dwa kolejne punkty znajduja sie pod analizowanym stropem
                                if (rObst.Contains(new Point(plinePoints[i].X, plinePoints[i].Y)) && rObst.Contains(new Point(plinePoints[i + 1].X, plinePoints[i + 1].Y)) && drawn == false)
                                {
                                    CreateWall(mPoly, plinePoints[i], plinePoints[i + 1], zMin, zmax);
                                }
                            }
                        }
                        // Ustaw wartosci na true, tak aby kolejne punkty nie powodowaly rysowania tych samych lini, ktore nie przecinaja stropu ...
                        drawn = true;
                        drawn2 = true;
                    }
                }
                // Nie ma przeciecia z polilinia - wszystkie punkty znajduja sie pod jednym obiektem - stropem
                else
                {
                    for (int i = 0; i < pline.NumberOfVertices - 1; i++)
                    {
                        CreateWall(mPoly, plinePoints[i], plinePoints[i + 1], zMin, zmax);
                    }
                }
            }
        }
        public void CreateWall(MPolygon mPoly, Point3d p1, Point3d p2, double zmin, double zmax)
        {
            //ed.WriteMessage("\nTutaj: " + mPoly.GeometricExtents.ToString());
            double x1 = Math.Round(p1.X, 4);
            double x2 = Math.Round(p2.X, 4);
            double y1 = Math.Round(p1.Y, 4);
            double y2 = Math.Round(p2.Y, 4);
            double z1 = Math.Round(p1.Z, 4);
            double height = zmax - zmin;

            x1 = Math.Round(x1 / Utils.Utils.snapUnit.X) * Utils.Utils.snapUnit.X;
            x2 = Math.Round(x2 / Utils.Utils.snapUnit.X) * Utils.Utils.snapUnit.X;
            y1 = Math.Round(y1 / Utils.Utils.snapUnit.Y) * Utils.Utils.snapUnit.Y;
            y2 = Math.Round(y2 / Utils.Utils.snapUnit.Y) * Utils.Utils.snapUnit.Y;

            //ed.WriteMessage("\nDiagnostic");
            //ed.WriteMessage("\nx1: " + x1);
            //ed.WriteMessage("\nx2: " + x2);
            //ed.WriteMessage("\ny1: " + y1);
            //ed.WriteMessage("\ny2: " + y2);

            Point3d middle = new Point3d();
            if (x1 == x2)
            {
                middle = new Point3d(x1 + Utils.Utils.snapUnit.X, (y1 + y2) / 2, z1);
                //ed.WriteMessage("\nx1 = x2, middle: " + middle.ToString());
            }
            else if (y1 == y2)
                middle = new Point3d((x1 + x2) / 2, y1 + Utils.Utils.snapUnit.Y, z1);
            else
                middle = new Point3d((x1 + x2 / 2) + Utils.Utils.snapUnit.X, (y1 + y2 / 2) + Utils.Utils.snapUnit.Y, z1);

            if (mPoly.IsPointInsideMPolygon(middle, 0).Count == 1)
            {
                if (x1 == x2)
                {
                    Utils.Utils.CreateBox(x1, x2 - Utils.Utils.snapUnit.X, y1, y2, zmin, zmax);
                    //ed.WriteMessage("\nis inside.");
                }
                else if (y1 == y2)
                    Utils.Utils.CreateBox(x1, x2, y1, y2 - Utils.Utils.snapUnit.Y, zmin, zmax);
                else
                    Utils.Utils.Bresenham(x1, y1, x2, y2, height, zmin);
            }
            else if (mPoly.IsPointInsideMPolygon(middle, 0).Count == 0)
            {
                if (x1 == x2)
                {
                    Utils.Utils.CreateBox(x1, x2 + Utils.Utils.snapUnit.X, y1, y2, zmin, zmax);
                    //ed.WriteMessage("\nczy jest zamk: " + mPoly.IsReallyClosing.ToString());
                    //ed.WriteMessage("\nis not inside.");
                }
                else if (y1 == y2)
                    Utils.Utils.CreateBox(x1, x2, y1, y2 + Utils.Utils.snapUnit.Y, zmin, zmax);
                else
                    Utils.Utils.Bresenham(x1, y1, x2, y2, height, zmin);
            }
        }

        [CommandMethod("fCWall")]
        public static void fCWall()
        {
            Utils.Utils.Init();
            Document doc = acApp.DocumentManager.MdiActiveDocument;
            Database db = doc.Database;
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;

            BulgePolyJig jig = new BulgePolyJig(ed.CurrentUserCoordinateSystem);

            // Get zMin & zMax | height level
            PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter Z-min level:");
            zMinO.DefaultValue = zMinOld;
            PromptDoubleResult zMin = ed.GetDouble(zMinO);
            if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
            zMinOld = zMin.Value;
            Utils.Utils.SetUCS(zMin.Value);

            if (!Utils.Layers.CurrentLayer().Contains("OBST")) Utils.Layers.SetLayerForCurrentFloor("!FDS_OBST[gypsum_board]");

            while (true)
            {
                PromptResult res = ed.Drag(jig);
                switch (res.Status)
                {
                    // New point was added, keep going
                    case PromptStatus.OK:
                        jig.AddDummyVertex();
                        break;
                    // Keyword was entered
                    case PromptStatus.Keyword:
                        if (jig.IsUndoing)
                            jig.RemoveLastVertex();
                        break;
                    // If the jig completed successfully, add the polyline
                    case PromptStatus.None:
                        jig.RemoveLastVertex();
                        jig.Append();
                        // Wyciagniecie geometrii
                        jig.ExtrudeToCeiling(zMin.Value);
                        Utils.Utils.End();
                        return;
                    // User cancelled the command, get out of here
                    // and don't forget to dispose the jigged entity
                    default:
                        jig.Entity.Dispose();
                        Utils.Utils.End();
                        return;
                }
            }
        }
#endif


    }
}