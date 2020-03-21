#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Teigha.DatabaseServices;
using acDb = Teigha.DatabaseServices;
using Bricscad.EditorInput;
using Teigha.Geometry;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using acDb = Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
#endif

using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Reflection;
using System.Linq.Expressions;

namespace WizFDS.Utils
{
    public class Utils
    {
        public static Object oldOrtho;
        public static Object oldSnapMode;
        public static Object oldOsMode;
        public static Object oldLayer;

        public static Object oldSnapUnit;
#if BRX_APP
        public static Point3d snapUnit;
#elif ARX_APP
        public static Point2d snapUnit;
#endif
        public static Point2d GetSnapUnit()
        {
            return (Point2d)acApp.GetSystemVariable("snapunit");
        }
        public static void SetSnapUnit(Point2d snap)
        {
            acApp.SetSystemVariable("snapunit", (Object)snap);
            return;
        }

        public static bool layersCreated = false;
        public static bool layersCreatedEvac = false;

        // Uniwersalne wartosci
        public static double oldZmin;
        public static double oldZmax;
        public static double oldHeight;

        public static void Init()
        {
            Layers.CreateBasicLayers();
            oldSnapMode = acApp.GetSystemVariable("snapmode");
            oldOsMode = acApp.GetSystemVariable("osmode");
            oldOrtho = acApp.GetSystemVariable("orthomode");
            oldLayer = acApp.GetSystemVariable("clayer");
#if BRX_APP
            snapUnit = (Point3d)acApp.GetSystemVariable("snapunit");
#elif ARX_APP
            snapUnit = (Point2d)acApp.GetSystemVariable("snapunit");
#endif

            if(snapUnit.X <= 2)
                acApp.SetSystemVariable("snapmode", 1);
            else
            {
#if BRX_APP
                Point3d snap = new Point3d(0.2, 0.2, 0.2);
#elif ARX_APP
                Point2d snap = new Point2d(0.2, 0.2);
#endif
                acApp.SetSystemVariable("snapunit", snap);
                acApp.SetSystemVariable("snapmode", 1);
            }

            acApp.SetSystemVariable("osmode", 0);
            ResetUCS();
        }
        public static void Init(bool ortho)
        {
            if (layersCreated == false)
            {
                //Point2d snap = new Point2d(0.2, 0.2);
                //acApp.SetSystemVariable("snapunit", (Object)snap);
            }
            Layers.CreateBasicLayers();
            oldSnapMode = acApp.GetSystemVariable("snapmode");
            oldOsMode = acApp.GetSystemVariable("osmode");
            oldOrtho = acApp.GetSystemVariable("orthomode");
            if (ortho) acApp.SetSystemVariable("orthomode", 1);
            oldLayer = acApp.GetSystemVariable("clayer");
#if BRX_APP
            snapUnit = (Point3d)acApp.GetSystemVariable("snapunit");
#elif ARX_APP
            snapUnit = (Point2d)acApp.GetSystemVariable("snapunit");
#endif

            if(snapUnit.X <= 2)
                acApp.SetSystemVariable("snapmode", 1);
            else
            {
#if BRX_APP
                Point3d snap = new Point3d(0.2, 0.2, 0.2);
#elif ARX_APP
                Point2d snap = new Point2d(0.2, 0.2);
#endif
                acApp.SetSystemVariable("snapunit", snap);
                acApp.SetSystemVariable("snapmode", 1);
            }

            acApp.SetSystemVariable("osmode", 0);

            ResetUCS();
        }
        public static void End()
        {
            acApp.SetSystemVariable("orthomode", oldOrtho);
            acApp.SetSystemVariable("snapmode", oldSnapMode);
            acApp.SetSystemVariable("osmode", oldOsMode);
            acApp.SetSystemVariable("clayer", oldLayer);
            ResetUCS();
        }

        public static void SetOrtho(bool ortho)
        {
            if (ortho) acApp.SetSystemVariable("orthomode", 1);
            else acApp.SetSystemVariable("orthomode", 0);
        }

        public static void SetUCS(double zLevela)
        {
            acApp.DocumentManager.MdiActiveDocument.Editor.CurrentUserCoordinateSystem = Matrix3d.Displacement(new Vector3d(0, 0, zLevela));
        }
        public static void SetGlobalUCS(double zLevela)
        {
            acApp.DocumentManager.MdiActiveDocument.Editor.CurrentUserCoordinateSystem = Matrix3d.Identity;
            acApp.DocumentManager.MdiActiveDocument.Editor.CurrentUserCoordinateSystem = Matrix3d.Displacement(new Vector3d(0, 0, zLevela));
        }
        public static void ResetUCS()
        {
            acApp.DocumentManager.MdiActiveDocument.Editor.CurrentUserCoordinateSystem = Matrix3d.Identity;
        }

        public static Extents3d GetAllElementsBoundingBox()
        {
            // Get the current document and database, and start a transaction
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                var ext = new Extents3d();
                PromptSelectionResult entities = ed.SelectAll();
                if (entities.Status == PromptStatus.OK)
                {
                    SelectionSet selection = entities.Value;
                    foreach (SelectedObject entity in selection)
                    {
                        Entity acEnt = acTrans.GetObject(entity.ObjectId,
                                                        OpenMode.ForRead) as Entity;
                        if (acEnt != null && acEnt is Solid3d)
                        {
                            ext.AddExtents(acEnt.GeometricExtents);
                        }
                    }
                }
                return ext;
            }
        }

        // CreateBox
        public static void CreateBox(Point3d p1, Point3d p2, double H)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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
                // Create a 3D solid box
                using (Solid3d acSol3DBox = new Solid3d())
                {
                    acSol3DBox.RecordHistory = true;
                    acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs((p1.Z + H) - p1.Z));
                    acSol3DBox.Layer = Layers.CurrentLayer();

                    // Position the center of the 3D solid 
                    Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), p1.Z + (H / 2));
                    acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));

                    // Add the new object to the block table record and the transaction
                    acBlkTblRec.AppendEntity(acSol3DBox);
                    acTrans.AddNewlyCreatedDBObject(acSol3DBox, true);
                    acSol3DBox.Draw();
                }
                // Save the new objects to the database
                acTrans.Commit();
            }
        }
        public static void CreateBox(Point3d p1, Point3d p2)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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
                // Create a 3D solid box
                using (Solid3d acSol3DBox = new Solid3d())
                {
                    acSol3DBox.RecordHistory = true;
                    acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs(p2.Z - p1.Z));
                    acSol3DBox.Layer = Layers.CurrentLayer();

                    // Position the center of the 3D solid 
                    Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), p1.Z + ((p2.Z - p1.Z) / 2));
                    acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));

                    // Add the new object to the block table record and the transaction
                    acBlkTblRec.AppendEntity(acSol3DBox);
                    acTrans.AddNewlyCreatedDBObject(acSol3DBox, true);
                    acSol3DBox.Draw();
                }
                // Save the new objects to the database
                acTrans.Commit();
            }
        }
        public static void CreateBox(Point3d p1, Point3d p2, string layer)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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
                // Create a 3D solid box
                using (Solid3d acSol3DBox = new Solid3d())
                {
                    acSol3DBox.RecordHistory = true;
                    acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs(p2.Z - p1.Z));
                    acSol3DBox.Layer = Layers.CurrentLayer();

                    // Position the center of the 3D solid 
                    Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), p1.Z + ((p2.Z - p1.Z) / 2));
                    acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));
                    acSol3DBox.Layer = layer;

                    // Add the new object to the block table record and the transaction
                    acBlkTblRec.AppendEntity(acSol3DBox);
                    acTrans.AddNewlyCreatedDBObject(acSol3DBox, true);
                    acSol3DBox.Draw();
                }
                // Save the new objects to the database
                acTrans.Commit();
            }
        }
        public static ObjectId CreateBox(Point3d p1, Point3d p2, string layer, bool returnId)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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
                // Create a 3D solid box
                Solid3d acSol3DBox = new Solid3d();
                acSol3DBox.RecordHistory = true;
                acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs(p2.Z - p1.Z));
                acSol3DBox.Layer = Layers.CurrentLayer();

                // Position the center of the 3D solid 
                Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), p1.Z + ((p2.Z - p1.Z) / 2));
                acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));
                acSol3DBox.Layer = layer;

                // Add the new object to the block table record and the transaction
                acBlkTblRec.AppendEntity(acSol3DBox);
                acTrans.AddNewlyCreatedDBObject(acSol3DBox, true);
                acSol3DBox.Draw();
                ObjectId id = acSol3DBox.ObjectId;
                // Save the new objects to the database
                acTrans.Commit();
                return id;
            }
        }
        public static ObjectId CreateBox(Point3d p1, Point3d p2, bool returnId)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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
                // Create a 3D solid box
                Solid3d acSol3DBox = new Solid3d();
                acSol3DBox.RecordHistory = true;
                acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs(p2.Z - p1.Z));
                acSol3DBox.Layer = Layers.CurrentLayer();

                // Position the center of the 3D solid 
                Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), p1.Z + ((p2.Z - p1.Z) / 2));
                acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));

                // Add the new object to the block table record and the transaction
                acBlkTblRec.AppendEntity(acSol3DBox);
                acTrans.AddNewlyCreatedDBObject(acSol3DBox, true);
                acSol3DBox.Draw();
                // Save the new objects to the database
                ObjectId id = acSol3DBox.ObjectId;
                acTrans.Commit();
                return id;
            }
        }
        public static void CreateBox(Point3d p1, Point3d p2, double H, double zMin)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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
                // Create a 3D solid box
                using (Solid3d acSol3DBox = new Solid3d())
                {
                    acSol3DBox.RecordHistory = true;
                    acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs(H));
                    acSol3DBox.Layer = Layers.CurrentLayer();

                    // Position the center of the 3D solid 
                    Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), zMin + (H / 2));
                    acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));

                    // Add the new object to the block table record and the transaction
                    acBlkTblRec.AppendEntity(acSol3DBox);
                    acTrans.AddNewlyCreatedDBObject(acSol3DBox, true);
                    acSol3DBox.Draw();
                }
                // Save the new objects to the database
                acTrans.Commit();
            }
        }
        public static ObjectId CreateBox(Point3d p1, Point3d p2, double H, double zMin, bool returnId)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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
                // Create a 3D solid box
                Solid3d acSol3DBox = new Solid3d();
                acSol3DBox.RecordHistory = true;
                acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs(H));
                acSol3DBox.Layer = Layers.CurrentLayer();

                // Position the center of the 3D solid 
                Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), zMin + (H / 2));
                acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));

                // Add the new object to the block table record and the transaction
                acBlkTblRec.AppendEntity(acSol3DBox);
                acTrans.AddNewlyCreatedDBObject(acSol3DBox, true);
                acSol3DBox.Draw();

                // Save the new objects to the database
                ObjectId id = acSol3DBox.ObjectId;
                acTrans.Commit();
                return id;
            }
        }
        public static void CreateBox(double x1, double x2, double y1, double y2, double z1, double z2)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            Point3d p1 = new Point3d(x1, y1, z1);
            Point3d p2 = new Point3d(x2, y2, z2);

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
                // Create a 3D solid box
                using (Solid3d acSol3DBox = new Solid3d())
                {
                    acSol3DBox.RecordHistory = true;
                    acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs(p2.Z - p1.Z));
                    acSol3DBox.Layer = Layers.CurrentLayer();

                    // Position the center of the 3D solid 
                    Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), p1.Z + ((p2.Z - p1.Z) / 2));
                    acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));

                    // Add the new object to the block table record and the transaction
                    acBlkTblRec.AppendEntity(acSol3DBox);
                    acTrans.AddNewlyCreatedDBObject(acSol3DBox, true);
                    acSol3DBox.Draw();
                }
                // Save the new objects to the database
                acTrans.Commit();
            }
        }
        public static ObjectId CreateBox(double x1, double x2, double y1, double y2, double z1, double z2, bool returnId)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            Point3d p1 = new Point3d(x1, y1, z1);
            Point3d p2 = new Point3d(x2, y2, z2);

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
                // Create a 3D solid box
                Solid3d acSol3DBox = new Solid3d();
                acSol3DBox.RecordHistory = true;
                acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs(p2.Z - p1.Z));
                acSol3DBox.Layer = Layers.CurrentLayer();

                // Position the center of the 3D solid 
                Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), p1.Z + ((p2.Z - p1.Z) / 2));
                acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));

                // Add the new object to the block table record and the transaction
                acBlkTblRec.AppendEntity(acSol3DBox);
                acTrans.AddNewlyCreatedDBObject(acSol3DBox, true);
                acSol3DBox.Draw();
                // Save the new objects to the database
                ObjectId id = acSol3DBox.ObjectId;
                acTrans.Commit();
                return id;
            }
        }
        public static void CreateBox(double x1, double x2, double y1, double y2, double z1, double z2, string layer)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            Point3d p1 = new Point3d(x1, y1, z1);
            Point3d p2 = new Point3d(x2, y2, z2);

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
                // Create a 3D solid box
                using (Solid3d acSol3DBox = new Solid3d())
                {
                    acSol3DBox.RecordHistory = true;
                    acSol3DBox.CreateBox(Math.Abs(p2.X - p1.X), Math.Abs(p2.Y - p1.Y), Math.Abs(p2.Z - p1.Z));
                    acSol3DBox.Layer = Layers.CurrentLayer();

                    // Position the center of the 3D solid 
                    Point3d center = new Point3d(p1.X + ((p2.X - p1.X) / 2), p1.Y + ((p2.Y - p1.Y) / 2), p1.Z + ((p2.Z - p1.Z) / 2));
                    acSol3DBox.TransformBy(Matrix3d.Displacement(center.GetAsVector()));
                    acSol3DBox.Layer = layer;

                    // Add the new object to the block table record and the transaction
                    acBlkTblRec.AppendEntity(acSol3DBox);
                    acTrans.AddNewlyCreatedDBObject(acSol3DBox, true);
                    acSol3DBox.Draw();
                }
                // Save the new objects to the database
                acTrans.Commit();
            }
        }

        // CreateRectangle
        public static void CreateRectangle(Point3d minPoint, Point3d maxPoint, Double crossSection, String coordinate)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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

                // Create a 3D polyline (closed)
                Point3d[] pts = null;
                if (coordinate == "Z")
                {
                    pts = new Point3d[]
                            { new Point3d(minPoint.X, minPoint.Y, crossSection),
                            new Point3d(minPoint.X, maxPoint.Y, crossSection),
                            new Point3d(maxPoint.X, maxPoint.Y, crossSection),
                            new Point3d(maxPoint.X, minPoint.Y, crossSection),
                            };
                }
                else if (coordinate == "X")
                {
                    pts = new Point3d[]
                            { new Point3d(crossSection, minPoint.Y, minPoint.Z),
                            new Point3d(crossSection, minPoint.Y, maxPoint.Z),
                            new Point3d(crossSection, maxPoint.Y, maxPoint.Z),
                            new Point3d(crossSection, maxPoint.Y, minPoint.Z),
                            };
                }
                else if (coordinate == "Y")
                {
                    pts = new Point3d[]
                            { new Point3d(minPoint.X, crossSection, minPoint.Z),
                            new Point3d(minPoint.X, crossSection, maxPoint.Z),
                            new Point3d(maxPoint.X, crossSection, maxPoint.Z),
                            new Point3d(maxPoint.X, crossSection, minPoint.Z),
                            };
                }
                Point3dCollection points = new Point3dCollection(pts);
                Polyline3d poly = new Polyline3d();
                // First add polyline to model space and transaction
                acBlkTblRec.AppendEntity(poly);
                acTrans.AddNewlyCreatedDBObject(poly, true);
                // Then add all vertices to polyline from point collection
                foreach (Point3d pt in points)
                {
                    // Now create the vertices
                    PolylineVertex3d vex3d = new PolylineVertex3d(pt);
                    // And add them to the 3dpoly (this adds them to the db also)
                    poly.AppendVertex(vex3d);
                    acTrans.AddNewlyCreatedDBObject(vex3d, true);
                }
                // Make polyline closed
                poly.Closed = true;
                // Commit transaction
                acTrans.Commit();
            }
            return;
        }
        public static ObjectId CreateRectangle(Point3d minPoint, Point3d maxPoint, string layer)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            ObjectId id = ObjectId.Null;
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

                // Create a 3D polyline (closed)
                Point3d[] pts = null;
                pts = new Point3d[]
                        { new Point3d(minPoint.X, minPoint.Y, minPoint.Z),
                        new Point3d(minPoint.X, maxPoint.Y, minPoint.Z),
                        new Point3d(maxPoint.X, maxPoint.Y, minPoint.Z),
                        new Point3d(maxPoint.X, minPoint.Y, minPoint.Z),
                        };

                Point3dCollection points = new Point3dCollection(pts);
                Polyline3d poly = new Polyline3d();
                // First add polyline to model space and transaction
                acBlkTblRec.AppendEntity(poly);
                acTrans.AddNewlyCreatedDBObject(poly, true);
                // Then add all vertices to polyline from point collection
                foreach (Point3d pt in points)
                {
                    // Now create the vertices
                    PolylineVertex3d vex3d = new PolylineVertex3d(pt);
                    // And add them to the 3dpoly (this adds them to the db also)
                    poly.AppendVertex(vex3d);
                    acTrans.AddNewlyCreatedDBObject(vex3d, true);
                }
                // Make polyline closed
                poly.Closed = true;
                poly.Layer = layer;

                // Commit transaction
                id = poly.ObjectId;
                acTrans.Commit();
            }
            return id;
        }

        // CreateLine
        public static void CreateLine(Point3d p1, Point3d p2)
        {
            // Get the current document and database
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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

                // Create a line that starts at 5,5 and ends at 12,3
                Line acLine = new Line(p1, p2);

                // Add the new object to the block table record and the transaction
                acBlkTblRec.AppendEntity(acLine);
                acTrans.AddNewlyCreatedDBObject(acLine, true);

                // Save the new object to the database
                acTrans.Commit();
            }
        }
        public static void CreateLine(double x1, double x2, double y1, double y2, double z1, double z2)
        {
            // Get the current document and database
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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

                // Create a line
                Line acLine = new Line(new Point3d(x1, y1, z1), new Point3d(x2, y2, z2));

                // Add the new object to the block table record and the transaction
                acBlkTblRec.AppendEntity(acLine);
                acTrans.AddNewlyCreatedDBObject(acLine, true);

                // Save the new object to the database
                acTrans.Commit();
            }
        }
        public static ObjectId CreateLine(double x1, double x2, double y1, double y2, double z1, double z2, bool returnId)
        {
            // Get the current document and database
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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

                // Create a line
                Line acLine = new Line(new Point3d(x1, y1, z1), new Point3d(x2, y2, z2));

                // Add the new object to the block table record and the transaction
                acBlkTblRec.AppendEntity(acLine);
                acTrans.AddNewlyCreatedDBObject(acLine, true);

                ObjectId id = acLine.ObjectId;

                // Save the new object to the database
                acTrans.Commit();

                return id;
            }
        }

        // CreateSurface
        /// <summary>
        /// Create surface
        /// </summary>
        /// <param name="minPoint"></param>
        /// <param name="maxPoint"></param>
        /// <param name="crossSection">Value of X, Y or Z in UCS</param>
        /// <param name="coordinate">String - X, Y or Z of surface</param>
        public static void CreatePlainSurface(Point3d minPoint, Point3d maxPoint, String coordinate, Double coordinateValue)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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

                // Create a 3D polyline (closed)
                acDb.Face face = null;
                if (coordinate == "Z")
                {
                    face = new acDb.Face(
                                new Point3d(minPoint.X, minPoint.Y, coordinateValue),
                                new Point3d(minPoint.X, maxPoint.Y, coordinateValue),
                                new Point3d(maxPoint.X, maxPoint.Y, coordinateValue),
                                new Point3d(maxPoint.X, minPoint.Y, coordinateValue),
                                true,
                                true,
                                true,
                                true
                            );
                }
                else if (coordinate == "X")
                {
                    face = new acDb.Face(
                                new Point3d(coordinateValue, minPoint.Y, minPoint.Z),
                                new Point3d(coordinateValue, minPoint.Y, maxPoint.Z),
                                new Point3d(coordinateValue, maxPoint.Y, maxPoint.Z),
                                new Point3d(coordinateValue, maxPoint.Y, minPoint.Z),
                                true,
                                true,
                                true,
                                true
                            );
                }
                else if (coordinate == "Y")
                {
                    face = new acDb.Face(
                                new Point3d(minPoint.X, coordinateValue, minPoint.Z),
                                new Point3d(minPoint.X, coordinateValue, maxPoint.Z),
                                new Point3d(maxPoint.X, coordinateValue, maxPoint.Z),
                                new Point3d(maxPoint.X, coordinateValue, minPoint.Z),
                                true,
                                true,
                                true,
                                true
                            );
                }

                acDb.Surface surface = new acDb.Surface();
                surface.SetDatabaseDefaults();
                surface = acDb.Surface.CreateFrom(face);
                surface.UIsoLineDensity = 0;
                surface.VIsoLineDensity = 0;
                surface.Layer = Layers.CurrentLayer();

                acBlkTblRec.AppendEntity(surface);
                acTrans.AddNewlyCreatedDBObject(surface, true);
                acTrans.Commit();
            }
            return;
        }
        public static ObjectId CreatePlainSurface(Point3d minPoint, Point3d maxPoint, String coordinate, Double coordinateValue, string layer, bool retrunId)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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

                // Create a 3D polyline (closed)
#if BRX_APP
                Teigha.DatabaseServices.Face face = null;
#elif ARX_APP
                Face face = null;
#endif
                if (coordinate == "Z")
                {
#if BRX_APP
                    face = new Teigha.DatabaseServices.Face(
                                new Point3d(minPoint.X, minPoint.Y, coordinateValue),
                                new Point3d(minPoint.X, maxPoint.Y, coordinateValue),
                                new Point3d(maxPoint.X, maxPoint.Y, coordinateValue),
                                new Point3d(maxPoint.X, minPoint.Y, coordinateValue),
                                true,
                                true,
                                true,
                                true
                            );
#elif ARX_APP
                    face = new Face(
                                new Point3d(minPoint.X, minPoint.Y, coordinateValue),
                                new Point3d(minPoint.X, maxPoint.Y, coordinateValue),
                                new Point3d(maxPoint.X, maxPoint.Y, coordinateValue),
                                new Point3d(maxPoint.X, minPoint.Y, coordinateValue),
                                true,
                                true,
                                true,
                                true
                            );
#endif
                }
                else if (coordinate == "X")
                {
#if BRX_APP
                    face = new Teigha.DatabaseServices.Face(
                                new Point3d(coordinateValue, minPoint.Y, minPoint.Z),
                                new Point3d(coordinateValue, minPoint.Y, maxPoint.Z),
                                new Point3d(coordinateValue, maxPoint.Y, maxPoint.Z),
                                new Point3d(coordinateValue, maxPoint.Y, minPoint.Z),
                                true,
                                true,
                                true,
                                true
                            );
#elif ARX_APP
                    face = new Face(
                                new Point3d(coordinateValue, minPoint.Y, minPoint.Z),
                                new Point3d(coordinateValue, minPoint.Y, maxPoint.Z),
                                new Point3d(coordinateValue, maxPoint.Y, maxPoint.Z),
                                new Point3d(coordinateValue, maxPoint.Y, minPoint.Z),
                                true,
                                true,
                                true,
                                true
                            );
#endif
                }
                else if (coordinate == "Y")
                {
#if BRX_APP
                    face = new Teigha.DatabaseServices.Face(
                                new Point3d(minPoint.X, coordinateValue, minPoint.Z),
                                new Point3d(minPoint.X, coordinateValue, maxPoint.Z),
                                new Point3d(maxPoint.X, coordinateValue, maxPoint.Z),
                                new Point3d(maxPoint.X, coordinateValue, minPoint.Z),
                                true,
                                true,
                                true,
                                true
                            );
#elif ARX_APP
                    face = new Face(
                                new Point3d(minPoint.X, coordinateValue, minPoint.Z),
                                new Point3d(minPoint.X, coordinateValue, maxPoint.Z),
                                new Point3d(maxPoint.X, coordinateValue, maxPoint.Z),
                                new Point3d(maxPoint.X, coordinateValue, minPoint.Z),
                                true,
                                true,
                                true,
                                true
                            );
#endif
                }

#if BRX_APP
                Teigha.DatabaseServices.Surface surface = new Teigha.DatabaseServices.Surface();
                surface.SetDatabaseDefaults();
                surface = Teigha.DatabaseServices.Surface.CreateFrom(face);
#elif ARX_APP
                Autodesk.AutoCAD.DatabaseServices.Surface surface = new Autodesk.AutoCAD.DatabaseServices.Surface();
                surface.SetDatabaseDefaults();
                surface = Autodesk.AutoCAD.DatabaseServices.Surface.CreateFrom(face);
#endif
                surface.UIsoLineDensity = 0;
                surface.VIsoLineDensity = 0;
                surface.Layer = layer;

                acBlkTblRec.AppendEntity(surface);
                acTrans.AddNewlyCreatedDBObject(surface, true);
                ObjectId id = surface.ObjectId;
                acTrans.Commit();

                return id;
            }
        }
        public static void CreateExtrudedSurface(Point3d minPoint, Point3d maxPoint)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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

                ExtrudedSurface extrSurf = new ExtrudedSurface();
                extrSurf.SetDatabaseDefaults();
                SweepOptions sweepOpts = new SweepOptions();
                extrSurf.CreateExtrudedSurface(poly, vec, sweepOpts);
                extrSurf.UIsoLineDensity = 0;
                extrSurf.VIsoLineDensity = 0;

                acBlkTblRec.AppendEntity(extrSurf);
                acTrans.AddNewlyCreatedDBObject(extrSurf, true);
                poly.Erase();
                acTrans.Commit();
            }
            return;
        }
        public static ObjectId CreateExtrudedSurface(Point3d minPoint, Point3d maxPoint, string layer, short uLines = 0, short vLines = 0)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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

                ExtrudedSurface extrSurf = new ExtrudedSurface();
                extrSurf.SetDatabaseDefaults();
                SweepOptions sweepOpts = new SweepOptions();
                extrSurf.CreateExtrudedSurface(poly, vec, sweepOpts);
                extrSurf.UIsoLineDensity = uLines;
                extrSurf.VIsoLineDensity = vLines;
                extrSurf.Layer = layer;

                acBlkTblRec.AppendEntity(extrSurf);
                acTrans.AddNewlyCreatedDBObject(extrSurf, true);
                poly.Erase();
                ObjectId id = extrSurf.ObjectId;
                acTrans.Commit();
                return id;
            }
        }

        public static acDb.Surface ReturnSurface(Point3d minPoint, Point3d maxPoint, Double crossSection, String coordinate)
        {
            // Get the current document and database, and start a transaction

            // Create a 3D polyline (closed)
                acDb.Face face = null;
            if (coordinate == "Z")
            {
                face = new acDb.Face(
                            new Point3d(minPoint.X, minPoint.Y, crossSection),
                            new Point3d(minPoint.X, maxPoint.Y, crossSection),
                            new Point3d(maxPoint.X, maxPoint.Y, crossSection),
                            new Point3d(maxPoint.X, minPoint.Y, crossSection),
                            true,
                            true,
                            true,
                            true
                        );
            }
            else if (coordinate == "X")
            {
                face = new acDb.Face(
                            new Point3d(crossSection, minPoint.Y, minPoint.Z),
                            new Point3d(crossSection, minPoint.Y, maxPoint.Z),
                            new Point3d(crossSection, maxPoint.Y, maxPoint.Z),
                            new Point3d(crossSection, maxPoint.Y, minPoint.Z),
                            true,
                            true,
                            true,
                            true
                        );
            }
            else if (coordinate == "Y")
            {
                face = new acDb.Face(
                            new Point3d(minPoint.X, crossSection, minPoint.Z),
                            new Point3d(minPoint.X, crossSection, maxPoint.Z),
                            new Point3d(maxPoint.X, crossSection, maxPoint.Z),
                            new Point3d(maxPoint.X, crossSection, minPoint.Z),
                            true,
                            true,
                            true,
                            true
                        );
            }

            acDb.Surface surface = new acDb.Surface();
            surface.SetDatabaseDefaults();
            surface = acDb.Surface.CreateFrom(face);
            surface.UIsoLineDensity = 0;
            surface.VIsoLineDensity = 0;

            //acBlkTblRec.AppendEntity(surface);
            //acTrans.AddNewlyCreatedDBObject(surface, true);
            //acTrans.Commit();

            return surface;
        }
        public static string ReturnSurfaceCoordinate(Point3d p1, Point3d p2)
        {
            if (p1.X == p2.X)
                return "X";
            else if (p1.Y == p2.Y)
                return "Y";
            else if (p1.Z == p2.Z)
                return "Z";
            else
                return "X";
        }
        public static double ReturnSurfaceCoordinateValue(Point3d p1, Point3d p2)
        {
            if (p1.X == p2.X)
                return p1.X;
            else if (p1.Y == p2.Y)
                return p1.Y;
            else if (p1.Z == p2.Z)
                return p1.Z;
            else
                return 0;
        }

        // CreateSphere
        public static void CreateSphere(Point3d p1, Double radius)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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
                // Create a 3D solid wedge
                using (Solid3d acSol3D = new Solid3d())
                {
                    acSol3D.CreateSphere(radius);
                    acSol3D.Layer = Layers.CurrentLayer();

                    // Position the center of the 3D solid at p1 
                    acSol3D.TransformBy(Matrix3d.Displacement(p1 - Point3d.Origin));

                    // Add the new object to the block table record and the transaction
                    acBlkTblRec.AppendEntity(acSol3D);
                    acTrans.AddNewlyCreatedDBObject(acSol3D, true);
                }
                // Save the new objects to the database
                acTrans.Commit();
            }
        }
        public static ObjectId CreateSphere(Point3d p1, Double radius, bool returnId)
        {
            // Get the current document and database, and start a transaction
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

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
                ObjectId id = ObjectId.Null;
                // Create a 3D solid wedge
                using (Solid3d acSol3D = new Solid3d())
                {
                    acSol3D.CreateSphere(radius);
                    acSol3D.Layer = Layers.CurrentLayer();

                    // Position the center of the 3D solid at p1 
                    acSol3D.TransformBy(Matrix3d.Displacement(p1 - Point3d.Origin));

                    // Add the new object to the block table record and the transaction
                    acBlkTblRec.AppendEntity(acSol3D);
                    acTrans.AddNewlyCreatedDBObject(acSol3D, true);
                    id = acSol3D.ObjectId;
                }
                // Save the new objects to the database
                acTrans.Commit();
                return id;
            }
        }

        // Bresenham
        /// <summary>
        /// Rysowanie obstow po skosie
        /// </summary>
        /// <param name="x1"></param>
        /// <param name="y1"></param>
        /// <param name="x2"></param>
        /// <param name="y2"></param>
        /// <param name="H"></param>
        /// <param name="zMin"></param>
        public static void Bresenham(double x1, double y1, double x2, double y2, double H, double zMin)
        {
            x1 = Math.Round(x1, 4);
            y1 = Math.Round(y1, 4);
            x2 = Math.Round(x2, 4);
            y2 = Math.Round(y2, 4);
            double x0 = x1;
            double y0 = y1;
            Point3d p1_line = new Point3d(x1, y1, zMin);
            Point3d p2_line = new Point3d(x2, y2, zMin);
            //Utils.Utils.UtilsCommand("._line", p1_line, p2_line, "");
            double w = x2 - x1;
            double h = y2 - y1;
            double dx1 = 0, dy1 = 0, dx2 = 0, dy2 = 0;
            if (w < 0) dx1 = -Utils.snapUnit.X; else if (w > 0) dx1 = Utils.snapUnit.X;
            if (h < 0) dy1 = -Utils.snapUnit.Y; else if (h > 0) dy1 = Utils.snapUnit.Y;
            if (w < 0) dx2 = -Utils.snapUnit.X; else if (w > 0) dx2 = Utils.snapUnit.X;
            double longest = Math.Abs(w);
            double shortest = Math.Abs(h);
            double numerator = Utils.snapUnit.X;
            if (!(longest > shortest))
            {
                longest = Math.Abs(h);
                shortest = Math.Abs(w);
                if (h < 0) dy2 = -Utils.snapUnit.Y; else if (h > 0) dy2 = Utils.snapUnit.Y;
                dx2 = 0;
                numerator = Utils.snapUnit.Y;
            }

            for (double i = 0; i <= longest; i += Utils.snapUnit.X)
            {
                numerator += shortest;
                if (numerator > longest)
                {
                    x1 += dx1;
                    y1 += dy1;

                    if (x1 == x2 || y1 == y2)
                    {
                        Point3d p1end = new Point3d(x0, y0, zMin);
                        Point3d p2end = new Point3d(x1, y1, zMin);
                        Utils.CreateBox(p1end, p2end, H);
                        break;
                    }

                    Point3d p1 = new Point3d(x0, y0, zMin);
                    Point3d p2 = new Point3d(x1, y1, zMin);
                    Utils.CreateBox(p1, p2, H);

                    numerator -= longest;
                    x0 = x1;
                    y0 = y1;
                }
                else
                {
                    x1 += dx2;
                    y1 += dy2;

                    if (x1 == x2 || y1 == y2)
                    {
                        Point3d p1end = new Point3d(x0, y0, zMin);
                        Point3d p2end = new Point3d(x1, y1, zMin);
                        Utils.CreateBox(p1end, p2end, H);
                        break;
                    }

                }
            }
        }

        // Objects selection
        public static List<Entity> SetSelection()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                List<Entity> objectList = new List<Entity>();
                // Get the current document and database
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                // Start a transaction
                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    BlockTable acBlkTbl;
                    acBlkTbl = acTrans.GetObject(acCurDb.BlockTableId,
                                                    OpenMode.ForRead) as BlockTable;

                    // Open the Block table record Model space for write
                    BlockTableRecord acBlkTblRec;
                    acBlkTblRec = acTrans.GetObject(acBlkTbl[BlockTableRecord.ModelSpace],
                                                    OpenMode.ForWrite) as BlockTableRecord;

                    // Request for objects to be selected in the drawing area
                    PromptSelectionResult acSSPrompt = acDoc.Editor.GetSelection();

                    // If the prompt status is OK, objects were selected
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
                                Entity acEnt = acTrans.GetObject(acSSObj.ObjectId,
                                                                 OpenMode.ForRead) as Entity;
                                objectList.Add(acEnt);
                            }
                        }
                    }
                    // Dispose of the transaction
                }
                return objectList;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e);
                return null;
            }
        }
        // Do zrobienia !!!
        public static List<Entity> SetSelection(string type)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                List<Entity> objectList = new List<Entity>();
                // Get the current document and database
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                // Start a transaction
                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    BlockTable acBlkTbl;
                    acBlkTbl = acTrans.GetObject(acCurDb.BlockTableId,
                                                    OpenMode.ForRead) as BlockTable;

                    // Open the Block table record Model space for write
                    BlockTableRecord acBlkTblRec;
                    acBlkTblRec = acTrans.GetObject(acBlkTbl[BlockTableRecord.ModelSpace],
                                                    OpenMode.ForWrite) as BlockTableRecord;

                    // Request for objects to be selected in the drawing area
                    PromptSelectionResult acSSPrompt = acDoc.Editor.GetSelection();

                    // If the prompt status is OK, objects were selected
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
                                Entity acEnt = acTrans.GetObject(acSSObj.ObjectId,
                                                                 OpenMode.ForRead) as Entity;
                                objectList.Add(acEnt);
                            }
                        }
                    }
                    // Dispose of the transaction
                }
                return objectList;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e);
                return null;
            }
        }

        // Delete AC object
        public static void DeleteObject(ObjectId objectId)
        {
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;

            // Start a transaction
            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                Entity item = (Entity)acTrans.GetObject(objectId, OpenMode.ForWrite);
                item.Erase();
                acTrans.Commit();
            }
        }

        // View sytles
        public static void ChangeViewStyle(string view)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                Transaction acTrans = acDoc.TransactionManager.StartTransaction();
                using (acTrans)
                {
                    ViewTable acViewTbl;
                    acViewTbl = acTrans.GetObject(acCurDb.ViewTableId, OpenMode.ForRead) as ViewTable;
                    // Open the View table for write
                    acViewTbl.UpgradeOpen();
                    // Create a new View table record and name the view 'View1'
                    DBDictionary dict = (DBDictionary)acTrans.GetObject(acCurDb.VisualStyleDictionaryId, OpenMode.ForRead);
                    ViewTableRecord acViewTblRec = ed.GetCurrentView().Clone() as ViewTableRecord;
                    acViewTblRec.VisualStyleId = dict.GetAt(view);
                    //acViewTblRec.Name = "tempView";
                    // Add the new View table record to the View table and the transaction
                    //acViewTbl.Add(acViewTblRec);
                    //acTrans.AddNewlyCreatedDBObject(acViewTblRec, true);
                    // Set 'View1' current
                    acDoc.Editor.SetCurrentView(acViewTblRec);
                    // Commit the changes
                    acTrans.Commit();
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
            }
        }

        // Zoom
        public static void ZoomExtents()
        {
#if BRX_APP
            Object acadObject = Bricscad.ApplicationServices.Application.AcadApplication;
#elif ARX_APP
            Object acadObject = Autodesk.AutoCAD.ApplicationServices.Application.AcadApplication;
#endif
            acadObject.GetType().InvokeMember("ZoomExtents", BindingFlags.InvokeMethod, null, acadObject, null);
        }
        public static void ZoomInit()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            Extents3d ext = GetAllElementsBoundingBox();
            Point2d min2d = new Point2d(ext.MinPoint.X - 3, ext.MinPoint.Y - 3);
            Point2d max2d = new Point2d(ext.MaxPoint.X + 3, ext.MaxPoint.Y + 3);

            ViewTableRecord view = new ViewTableRecord();
            view.CenterPoint = min2d + ((max2d - min2d) / 2.0);
            view.Height = max2d.Y - min2d.Y;
            view.Width = max2d.X - min2d.X;
            ed.SetCurrentView(view);
        }


#if ARX_APP
        //acad.exe dla wersji poniżej równej 2012 roku
        [DllImport("accore.dll", CharSet = CharSet.Ansi, CallingConvention = CallingConvention.Cdecl, EntryPoint = "acedCmd")]
        private static extern int acedCmd(System.IntPtr vlist);
        public static void Command(string command)
        {
            ResultBuffer rb = new ResultBuffer();
            // RTSTR = 5005
            rb.Add(new TypedValue(5005, command));
            // start the command
            acedCmd(rb.UnmanagedObject);

            bool quit = false;
            // loop round while the insert command is active
            while (!quit)
            {
                // see what commands are active
                string cmdNames = (string)Autodesk.AutoCAD.ApplicationServices.Application.GetSystemVariable("CMDNAMES");
                // if the INSERT command is active
                if (cmdNames.ToUpper().IndexOf(command.Substring(2)) >= 0)
                {
                    // then send a PAUSE to the command line
                    rb = new ResultBuffer();
                    // RTSTR = 5005 - send a user pause to the command line
                    rb.Add(new TypedValue(5005, "\\"));
                    acedCmd(rb.UnmanagedObject);
                }
                else
                    // otherwise quit
                    quit = true;
            }
        }
#endif


    }
}

// Rysowanie prostokatow w widoku 3d zeby nie byly plaskie oraz komendy
#if BRX_APP
namespace Bricscad.EditorInput
{
    public static class EditorExtensions
    {
        public static PromptUcsCornerResult GetUcsCorner(this Editor ed, string message, Point3d basePoint)
        {
            var ucs = ed.CurrentUserCoordinateSystem;
            var normal = ucs.CoordinateSystem3d.Zaxis;
            var ocsPlane = new Plane(Point3d.Origin, normal);
            using (var pline = new Teigha.DatabaseServices.Polyline(4))
            {
                var p2d = basePoint.TransformBy(ucs).Convert2d(ocsPlane);
                pline.AddVertexAt(0, p2d, 0.0, 0.0, 0.0);
                pline.AddVertexAt(1, p2d, 0.0, 0.0, 0.0);
                pline.AddVertexAt(2, p2d, 0.0, 0.0, 0.0);
                pline.AddVertexAt(3, p2d, 0.0, 0.0, 0.0);
                pline.Closed = true;
                pline.Normal = normal;
                pline.Elevation = basePoint.TransformBy(ucs).TransformBy(Matrix3d.WorldToPlane(ocsPlane)).Z;
                var jig = new RectangleJig(pline, message, ocsPlane);
                return new PromptUcsCornerResult((PromptPointResult)ed.Drag(jig));
            }
        }

        public class PromptUcsCornerResult
        {
            PromptPointResult result;

            internal PromptUcsCornerResult(PromptPointResult result)
            {
                this.result = result;
                var ed = acApp.DocumentManager.MdiActiveDocument.Editor;
                Value = this.result.Value.TransformBy(ed.CurrentUserCoordinateSystem.Inverse());
            }

            public PromptStatus Status => result.Status;

            public string StringResult => result.StringResult;

            public Point3d Value { get; }
        }

        class RectangleJig : EntityJig
        {
            Matrix3d ucs, wcs;
            Plane plane;
            Teigha.DatabaseServices.Polyline pline;
            Point3d ucsBasePoint, dragPoint;
            string message;

            public RectangleJig(Teigha.DatabaseServices.Polyline pline, string message, Plane plane) : base(pline)
            {
                this.pline = pline;
                this.message = message;
                this.plane = plane;
                var ed = acApp.DocumentManager.MdiActiveDocument.Editor;
                ucs = ed.CurrentUserCoordinateSystem;
                wcs = ucs.Inverse();
                ucsBasePoint = pline.GetPoint3dAt(0).TransformBy(wcs);
            }

            protected override SamplerStatus Sampler(JigPrompts prompts)
            {
                var options = new JigPromptPointOptions(message);
                options.BasePoint = pline.GetPoint3dAt(0);
                options.UseBasePoint = true;
                options.UserInputControls =
                    UserInputControls.Accept3dCoordinates;
                    //UserInputControls.Accept3dCoordinates |
                    //UserInputControls.UseBasePointElevation;
                var result = prompts.AcquirePoint(options);
                if (dragPoint.IsEqualTo(result.Value))
                    return SamplerStatus.NoChange;
                dragPoint = result.Value;
                return SamplerStatus.OK;
            }

            protected override bool Update()
            {
                var tmp = dragPoint.TransformBy(wcs);
                var pt1 = new Point3d(tmp.X, ucsBasePoint.Y, ucsBasePoint.Z).TransformBy(ucs);
                var pt3 = new Point3d(ucsBasePoint.X, tmp.Y, ucsBasePoint.Z).TransformBy(ucs);
                var pt2 = tmp.TransformBy(ucs);
                pline.SetPointAt(1, pt1.Convert2d(plane));
                pline.SetPointAt(2, pt2.Convert2d(plane));
                pline.SetPointAt(3, pt3.Convert2d(plane));
                return true;
            }
        }
    }

    // Dodanie mozliwosci komend  
    // Document doc = Application.DocumentManager.MdiActiveDocument;
    // Editor editor = doc.Editor;
    // editor.Command( "._EXPORTLAYOUT", "filename-goes-here" );
    public static class EditorInputExtensionMethods
    {
        public static PromptStatus Command(this Editor editor, params object[] args)
        {
            if (editor == null)
                throw new ArgumentNullException("editor");
            return runCommand(editor, args);
        }

        static Func<Editor, object[], PromptStatus> runCommand = GenerateRunCommand();

        static Func<Editor, object[], PromptStatus> GenerateRunCommand()
        {
            MethodInfo method = typeof(Editor).GetMethod("RunCommand",
               BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
            var instance = Expression.Parameter(typeof(Editor), "instance");
            var args = Expression.Parameter(typeof(object[]), "args");
            return Expression.Lambda<Func<Editor, object[], PromptStatus>>(
               Expression.Call(instance, method, args), instance, args)
                  .Compile();
        }
    }
}
#elif ARX_APP
namespace Autodesk.AutoCAD.EditorInput
{
    public static class EditorExtensions
    {

        public static PromptUcsCornerResult GetUcsCorner(this Editor ed, string message, Point3d basePoint)
        {
            var ucs = ed.CurrentUserCoordinateSystem;
            var normal = ucs.CoordinateSystem3d.Zaxis;
            var ocsPlane = new Plane(Point3d.Origin, normal);
            using (var pline = new Polyline(4))
            {
                var p2d = basePoint.TransformBy(ucs).Convert2d(ocsPlane);
                pline.AddVertexAt(0, p2d, 0.0, 0.0, 0.0);
                pline.AddVertexAt(1, p2d, 0.0, 0.0, 0.0);
                pline.AddVertexAt(2, p2d, 0.0, 0.0, 0.0);
                pline.AddVertexAt(3, p2d, 0.0, 0.0, 0.0);
                pline.Closed = true;
                pline.Normal = normal;
                pline.Elevation = basePoint.TransformBy(ucs).TransformBy(Matrix3d.WorldToPlane(ocsPlane)).Z;
                var jig = new RectangleJig(pline, message, ocsPlane);
                return new PromptUcsCornerResult((PromptPointResult)ed.Drag(jig));
            }
        }

        public class PromptUcsCornerResult
        {
            PromptPointResult result;

            internal PromptUcsCornerResult(PromptPointResult result)
            {
                this.result = result;
                var ed = acApp.DocumentManager.MdiActiveDocument.Editor;
                Value = this.result.Value.TransformBy(ed.CurrentUserCoordinateSystem.Inverse());
            }

            public PromptStatus Status => result.Status;

            public string StringResult => result.StringResult;

            public Point3d Value { get; }
        }

        class RectangleJig : EntityJig
        {
            Matrix3d ucs, wcs;
            Plane plane;
            Polyline pline;
            Point3d ucsBasePoint, dragPoint;
            string message;

            public RectangleJig(Polyline pline, string message, Plane plane) : base(pline)
            {
                this.pline = pline;
                this.message = message;
                this.plane = plane;
                var ed = acApp.DocumentManager.MdiActiveDocument.Editor;
                ucs = ed.CurrentUserCoordinateSystem;
                wcs = ucs.Inverse();
                ucsBasePoint = pline.GetPoint3dAt(0).TransformBy(wcs);
            }

            protected override SamplerStatus Sampler(JigPrompts prompts)
            {
                var options = new JigPromptPointOptions(message);
                options.BasePoint = pline.GetPoint3dAt(0);
                options.UseBasePoint = true;
                options.UserInputControls =
                    UserInputControls.Accept3dCoordinates |
                    UserInputControls.UseBasePointElevation;
                var result = prompts.AcquirePoint(options);
                if (dragPoint.IsEqualTo(result.Value))
                    return SamplerStatus.NoChange;
                dragPoint = result.Value;
                return SamplerStatus.OK;
            }

            protected override bool Update()
            {
                var tmp = dragPoint.TransformBy(wcs);
                var pt1 = new Point3d(tmp.X, ucsBasePoint.Y, ucsBasePoint.Z).TransformBy(ucs);
                var pt3 = new Point3d(ucsBasePoint.X, tmp.Y, ucsBasePoint.Z).TransformBy(ucs);
                var pt2 = tmp.TransformBy(ucs);
                pline.SetPointAt(1, pt1.Convert2d(plane));
                pline.SetPointAt(2, pt2.Convert2d(plane));
                pline.SetPointAt(3, pt3.Convert2d(plane));
                return true;
            }
        }
    }

    // Dodanie mozliwosci komend  
    // Document doc = Application.DocumentManager.MdiActiveDocument;
    // Editor editor = doc.Editor;
    // editor.Command( "._EXPORTLAYOUT", "filename-goes-here" );
    public static class EditorInputExtensionMethods
    {
        public static PromptStatus Command(this Editor editor, params object[] args)
        {
            if (editor == null)
                throw new ArgumentNullException("editor");
            return runCommand(editor, args);
        }

        static Func<Editor, object[], PromptStatus> runCommand = GenerateRunCommand();

        static Func<Editor, object[], PromptStatus> GenerateRunCommand()
        {
            MethodInfo method = typeof(Editor).GetMethod("RunCommand",
               BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
            var instance = Expression.Parameter(typeof(Editor), "instance");
            var args = Expression.Parameter(typeof(object[]), "args");
            return Expression.Lambda<Func<Editor, object[], PromptStatus>>(
               Expression.Call(instance, method, args), instance, args)
                  .Compile();
        }
    }
}
#endif

