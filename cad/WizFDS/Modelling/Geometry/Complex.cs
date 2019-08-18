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
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Runtime;
using Autodesk.AutoCAD.Geometry;
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
                        if (sol.Layer.Contains("!FDS_GEOM") || sol.Layer.Contains("!FDS_OBST"))
                        {
                            mesh.Layer = sol.Layer;
                        }
                        else
                        {
                            mesh.Layer = "!FDS_GEOM[inert](0)";
                        }

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


        /**
         * Export complex geomtry mesh -> 
         * faces and vertices to text file
         */
        [CommandMethod("fEXPORTMESH")]
        public void fgetpoints()
        {
            try
            {
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;
                Editor ed = acDoc.Editor;

                Utils.Utils.Init();

                PromptSelectionOptions peo = new PromptSelectionOptions();
                //PromptEntityOptions peo = new PromptEntityOptions("\nSelect mesh:");
                peo.AllowDuplicates = false;
                PromptSelectionResult per = ed.GetSelection(peo);
                if (per.Status != PromptStatus.OK || per.Status == PromptStatus.Cancel || per.Status == PromptStatus.Error || per.Status == PromptStatus.None)
                {
                    Utils.Utils.End();
                    return;
                }

                // Enter file name
                string mydocpath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                var psfo = new PromptSaveFileOptions("Export complex geometry");
                psfo.Filter = "txt (*.txt)|*.txt";
                var pr = ed.GetFileNameForSave(psfo);

                if (pr.Status != PromptStatus.OK)
                    return;

                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    using (StreamWriter outputFile = new StreamWriter(pr.StringResult))
                    {

                        SelectionSet acSSet = per.Value;

                        // Step through the objects in the selection set
                        foreach (SelectedObject acSSObj in acSSet)
                        {
                            Entity entity = acTrans.GetObject(acSSObj.ObjectId, OpenMode.ForRead) as Entity;
                            if (entity.GetType() == typeof(SubDMesh))
                            {
                                SubDMesh mesh = acTrans.GetObject(acSSObj.ObjectId, OpenMode.ForRead) as SubDMesh;
                                if (mesh != null)
                                {
                                    // Generate array that contains info about faces, i.e. [0] => number of edges, [1] => vert[0], [2] => vert[1], ...
                                    int[] faceArr = mesh.FaceArray.ToArray();
                                    Point3dCollection vertices = mesh.Vertices;
                                    int edges = 0;

                                    // Append text to selected file named.
                                    outputFile.WriteLine("&GEOM ID='COMPLEX_GEOM_1',");
                                    outputFile.WriteLine("SURF_ID = '" + Utils.Layers.GetSurfaceName(mesh.Layer.ToString()) + "',");
                                    outputFile.Write("VERTS =\t");
                                    foreach (Point3d vertice in vertices)
                                    {
                                        if (vertice == vertices[0])
                                            outputFile.Write(String.Format("{0}, {1}, {2},\n", vertice.X, vertice.Y, vertice.Z));
                                        else
                                            outputFile.Write(String.Format("\t\t{0}, {1}, {2},\n", vertice.X, vertice.Y, vertice.Z));
                                    }

                                    outputFile.Write(String.Format("FACES =\t"));
                                    // x = edges
                                    // x + 1 = vertice 1
                                    // x + 2 = vertice 2
                                    // x + 3 = vertice 3
                                    for (int x = 0; x < faceArr.Length; x = x + edges + 1) // Zacznij od 0; mniejsze od dlugosci; zrob skok co 3 (liczba krawedzi) + 1
                                    {
                                        if (x == 0)
                                            outputFile.Write(String.Format("{0}, {1}, {2}, 1,\n", faceArr[x + 1] + 1, faceArr[x + 2] + 1, faceArr[x + 3] + 1));
                                        else
                                            outputFile.Write(String.Format("\t\t{0}, {1}, {2}, 1,\n", faceArr[x + 1] + 1, faceArr[x + 2] + 1, faceArr[x + 3] + 1));

                                        edges = faceArr[x]; // face array na x posiada info ile jest krawedzi - dla nas zawsze 3
                                    }
                                    outputFile.WriteLine("/\n\n");
                                }
                            }
                        }
                    }
                    acTrans.Commit();
                }
                Utils.Utils.End();
                return;
            }
            catch (System.Exception e)
            {
                Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
                ed.WriteMessage("Program error: " + e.ToString());
                Utils.Utils.End();
                return;
            }
        }
    }
}
