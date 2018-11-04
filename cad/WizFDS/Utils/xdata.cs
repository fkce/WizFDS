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

namespace WizFDS.Utils
{
    public static class Xdata
    {
        static string appName = "wizzFDS";
        public static void SaveXdata(string data, ObjectId objId)
        {
            // Get the current database and start a transaction
            Database acCurDb;
            acCurDb = acApp.DocumentManager.MdiActiveDocument.Database;

            Document acDoc = acApp.DocumentManager.MdiActiveDocument;

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the Registered Applications table for read
                RegAppTable acRegAppTbl;
                acRegAppTbl = acTrans.GetObject(acCurDb.RegAppTableId, OpenMode.ForRead) as RegAppTable;

                // Check to see if the Registered Applications table record for the custom app exists
                if (acRegAppTbl.Has(appName) == false)
                {
                    using (RegAppTableRecord acRegAppTblRec = new RegAppTableRecord())
                    {
                        acRegAppTblRec.Name = appName;

                        acRegAppTbl.UpgradeOpen();
                        acRegAppTbl.Add(acRegAppTblRec);
                        acTrans.AddNewlyCreatedDBObject(acRegAppTblRec, true);
                    }
                }

                // Define the Xdata to add to each selected object
                using (ResultBuffer rb = new ResultBuffer())
                {
                    rb.Add(new TypedValue((int)DxfCode.ExtendedDataRegAppName, appName));
                    rb.Add(new TypedValue((int)DxfCode.ExtendedDataAsciiString, data));

                    // Open the selected object for write
                    Entity acEnt = acTrans.GetObject(objId, OpenMode.ForWrite) as Entity;

                    // Append the extended data to each object
                    acEnt.XData = rb;
                }

                // Save the new object to the database
                acTrans.Commit();

                // Dispose of the transaction
            }
        }

        public static string LoadXData(ObjectId objId)
        {
            // Get the current database and start a transaction
            Database acCurDb;
            acCurDb = acApp.DocumentManager.MdiActiveDocument.Database;

            Document acDoc = acApp.DocumentManager.MdiActiveDocument;

            string msgstr = "";

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Open the selected object for read
                Entity acEnt = acTrans.GetObject(objId, OpenMode.ForRead) as Entity;

                // Get the extended data attached to each object for MY_APP
                ResultBuffer rb = acEnt.GetXDataForApplication(appName);

                // Make sure the Xdata is not empty
                if (rb != null)
                {
                    // Get the values in the xdata
                    foreach (TypedValue typeVal in rb)
                    {
                        if(typeVal.TypeCode == 1000)
                        {
                            msgstr = typeVal.Value.ToString();
                        }
                    }
                }
                else
                {
                    msgstr = "";
                }

                // Ends the transaction and ensures any changes made are ignored
                acTrans.Abort();
                // Dispose of the transaction
            }
            return msgstr;
        }

        [CommandMethod("xdataview")]
        public static void ViewXData()
        {
            // Get the current database and start a transaction
            Database acCurDb;
            acCurDb = acApp.DocumentManager.MdiActiveDocument.Database;

            Document acDoc = acApp.DocumentManager.MdiActiveDocument;

            string appName = "wizzFDS";
            string msgstr = "";

            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
            {
                // Request objects to be selected in the drawing area
                PromptSelectionResult acSSPrompt = acDoc.Editor.GetSelection();

                // If the prompt status is OK, objects were selected
                if (acSSPrompt.Status == PromptStatus.OK)
                {
                    SelectionSet acSSet = acSSPrompt.Value;

                    // Step through the objects in the selection set
                    foreach (SelectedObject acSSObj in acSSet)
                    {
                        // Open the selected object for read
                        Entity acEnt = acTrans.GetObject(acSSObj.ObjectId,
                                                         OpenMode.ForRead) as Entity;

                        // Get the extended data attached to each object for MY_APP
                        ResultBuffer rb = acEnt.GetXDataForApplication(appName);

                        // Make sure the Xdata is not empty
                        if (rb != null)
                        {
                            // Get the values in the xdata
                            foreach (TypedValue typeVal in rb)
                            {
                                msgstr = msgstr + "\n" + typeVal.TypeCode.ToString() + ":" + typeVal.Value;
                            }
                        }
                        else
                        {
                            msgstr = "NONE";
                        }

                        // Display the values returned
                        acApp.ShowAlertDialog(appName + " xdata on " + acEnt.GetType().ToString() + ":\n" + msgstr);

                        msgstr = "";
                    }
                }

                // Ends the transaction and ensures any changes made are ignored
                acTrans.Abort();

                // Dispose of the transaction
            }
        }

//        [CommandMethod("SaveXdata")]
//        public void SaveXdata()
//        {
//            // Get the current database and start a transaction
//            Database acCurDb;
//            acCurDb = acApp.DocumentManager.MdiActiveDocument.Database;

//            Document acDoc = acApp.DocumentManager.MdiActiveDocument;

//            string appName = "MY_APP";
//            string xdataStr = "This is some xdata";

//            using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
//            {
//                // Request objects to be selected in the drawing area
//                PromptSelectionResult acSSPrompt = acDoc.Editor.GetSelection();

//                // If the prompt status is OK, objects were selected
//                if (acSSPrompt.Status == PromptStatus.OK)
//                {
//                    // Open the Registered Applications table for read
//                    RegAppTable acRegAppTbl;
//                    acRegAppTbl = acTrans.GetObject(acCurDb.RegAppTableId, OpenMode.ForRead) as RegAppTable;

//                    // Check to see if the Registered Applications table record for the custom app exists
//                    if (acRegAppTbl.Has(appName) == false)
//                    {
//                        using (RegAppTableRecord acRegAppTblRec = new RegAppTableRecord())
//                        {
//                            acRegAppTblRec.Name = appName;

//                            acRegAppTbl.UpgradeOpen();
//                            acRegAppTbl.Add(acRegAppTblRec);
//                            acTrans.AddNewlyCreatedDBObject(acRegAppTblRec, true);
//                        }
//                    }

//                    // Define the Xdata to add to each selected object
//                    using (ResultBuffer rb = new ResultBuffer())
//                    {
//                        rb.Add(new TypedValue((int)DxfCode.ExtendedDataRegAppName, appName));
//                        rb.Add(new TypedValue((int)DxfCode.ExtendedDataAsciiString, xdataStr));

//                        SelectionSet acSSet = acSSPrompt.Value;

//                        // Step through the objects in the selection set
//                        foreach (SelectedObject acSSObj in acSSet)
//                        {
//                            // Open the selected object for write
//                            Entity acEnt = acTrans.GetObject(acSSObj.ObjectId,
//                                                                OpenMode.ForWrite) as Entity;

//                            // Append the extended data to each object
//                            acEnt.XData = rb;
//                        }
//                    }
//                }

//                // Save the new object to the database
//                acTrans.Commit();

//                // Dispose of the transaction
//            }
//        }


    }
}