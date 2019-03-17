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
using Autodesk.AutoCAD.Runtime;
#endif

using System;
using WizFDS.Websocket;
using System.IO;
using System.Windows.Forms;
using System.Text.RegularExpressions;
using System.Globalization;

namespace WizFDS.Modelling.Geometry
{
    public class Complex
    {

        [CommandMethod("fSOLMESH")]
        static public void MeshFromSolid()
        {
            Utils.Utils.Init();

            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            Database acCurDb = acDoc.Database;
            Editor ed = acDoc.Editor;

            while (true)
            {
                // Ask the user to select a solid
                PromptEntityOptions peo = new PromptEntityOptions("Select a 3D solid");
                peo.SetRejectMessage("\nA 3D solid must be selected.");
                peo.AddAllowedClass(typeof(Solid3d), true);
                PromptEntityResult per = ed.GetEntity(peo);

                if (per.Status == PromptStatus.Cancel || per.Status == PromptStatus.Error) { Utils.Utils.End(); return; }

                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // Open the Block table for read
                    BlockTable acBlkTbl;
                    acBlkTbl = acTrans.GetObject(acCurDb.BlockTableId, OpenMode.ForRead) as BlockTable;
                    // Open the Block table record Model space for write
                    BlockTableRecord acBlkTblRec;
                    acBlkTblRec = acTrans.GetObject(acBlkTbl[BlockTableRecord.ModelSpace], OpenMode.ForWrite) as BlockTableRecord;

                    Solid3d sol = acTrans.GetObject(per.ObjectId, OpenMode.ForWrite) as Solid3d;

                    try
                    {
                        // Set mesh/faces properties 
                        MeshFaceterData mfd = new MeshFaceterData();
                        mfd.FaceterMeshType = 2;
                        mfd.FaceterDevNormal = 40;
                        mfd.FaceterDevSurface = 0.05;
                        mfd.FaceterGridRatio = 0;
                        mfd.FaceterMaxEdgeLength = 0;

                        MeshDataCollection md = SubDMesh.GetObjectMesh(sol, mfd);

                        // Create mesh
                        SubDMesh mesh = new SubDMesh();
                        mesh.SetDatabaseDefaults();
                        mesh.SetSubDMesh(md.VertexArray, md.FaceArray, 0);
                        mesh.Layer = sol.Layer;

                        // Add mesh to DB
                        acBlkTblRec.AppendEntity(mesh);
                        acTrans.AddNewlyCreatedDBObject(mesh, true);

                        // Delete solid object
                        sol.Erase(true);

                        acTrans.Commit();
                    }
                    catch (System.Exception ex)
                    {
                        ed.WriteMessage("Exception: {0}", ex.Message);
                    }

                }
            }
        }
    }
}
