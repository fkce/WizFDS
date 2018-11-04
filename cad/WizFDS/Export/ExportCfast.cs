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
#endif

using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.IO;
using Newtonsoft.Json;
using WizFDS.Websocket;
using System.Linq;

namespace WizFDS.Export
{
    public class ExportCfast
    {

        /// <summary>
        /// Create CFAST object which contain export objects
        /// </summary>
        private class CfastObject
        {
            public List<Object> ROOM { get; set; }
            public List<Object> HOLE { get; set; }
            public List<Object> COR { get; set; }
            public List<Object> STAI { get; set; }
            public List<Object> HALL { get; set; }
            public List<Object> D { get; set; }
            public List<Object> E { get; set; }
            public List<Object> C { get; set; }
            public List<Object> I { get; set; }
            public List<Object> W { get; set; }
            public List<Object> VNT { get; set; }
            //public string ac_file { get; set; }
            //public string ac_hash { get; set; }
        }

        /// <summary>
        /// Get min point from Entity->GeometricalExtents
        /// </summary>
        /// <param name="acEnt">A <see cref="Entity"/> type representing value.</param>
        /// <returns>Returs double array with 3 values</returns>
        private static double[] GetMin(Entity acEnt)
        {
            double[] min = new double[3];
            min[0] = Math.Round(acEnt.GeometricExtents.MinPoint.X, 4);
            min[1] = Math.Round(acEnt.GeometricExtents.MinPoint.Y, 4);
            min[2] = Math.Round(acEnt.GeometricExtents.MinPoint.Z, 4);

            return min;
        }

        /// <summary>
        /// Get max point from Entity->GeometricalExtents
        /// </summary>
        /// <param name="acEnt">A <see cref="Entity"/> type representing value.</param>
        /// <returns>Returs double array with 3 values</returns>
        private static double[] GetMax(Entity acEnt)
        {
            double[] min = new double[3];
            min[0] = Math.Round(acEnt.GeometricExtents.MaxPoint.X, 4);
            min[1] = Math.Round(acEnt.GeometricExtents.MaxPoint.Y, 4);
            min[2] = Math.Round(acEnt.GeometricExtents.MaxPoint.Z, 4);

            return min;
        }

        /// <summary>
        /// Convert CFAST geometry to JSON and send JSON to GUI by Websocket 
        /// </summary>
        [CommandMethod("cEXPORT")]
        public static void CExport()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;

            Dictionary<string, object> Cfast = new Dictionary<string, object>();

            try
            {
                // Select all elements
                // Get the current document and database
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                // Start a transaction
                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // Create a TypedValue array to define the filter criteria
                    TypedValue[] filterlist = new TypedValue[1];
                    filterlist[0] = new TypedValue(8, "!CFAST*");
                    SelectionFilter filter = new SelectionFilter(filterlist);

                    // Request for objects to be selected in the drawing area
                    PromptSelectionResult acSSPrompt;
                    acSSPrompt = ed.SelectAll(filter);

                    // If the prompt status is OK, objects were selected
                    if (acSSPrompt.Status == PromptStatus.OK)
                    {
                        SelectionSet acSSet = acSSPrompt.Value;

                        // Create dictionary with floors
                        foreach (SelectedObject acSSObj in acSSet)
                        {
                            // Check to make sure a valid SelectedObject object was returned
                            if (acSSObj != null)
                            {
                                // Open the selected object for write
                                Entity acEnt = acTrans.GetObject(acSSObj.ObjectId,
                                                                    OpenMode.ForRead) as Entity;
                                // Get current floor from current layer name
                                Regex regEx = new Regex(@"\((.)\)", RegexOptions.IgnoreCase);
                                Match match = regEx.Match(acEnt.Layer.ToString());
                                if (match.Success)
                                {
                                    System.Text.RegularExpressions.Group group = match.Groups[1];
                                    if (!Cfast.ContainsKey(group.ToString()))
                                        Cfast.Add(group.ToString(), null);
                                }
                            }
                        }

                        // Foreach floor add object
                        foreach (var floor in Cfast.Keys.ToList())
                        {
                            CfastObject cfastObject = new CfastObject
                            {
                                ROOM = new List<Object>(),
                                HOLE = new List<Object>(),
                                COR = new List<Object>(),
                                STAI = new List<Object>(),
                                HALL = new List<Object>(),
                                D = new List<Object>(),
                                E = new List<Object>(),
                                C = new List<Object>(),
                                I = new List<Object>(),
                                W = new List<Object>(),
                                VNT = new List<Object>()
                            };

                            foreach (SelectedObject acSSObj in acSSet)
                            {
                                // Check to make sure a valid SelectedObject object was returned
                                if (acSSObj != null)
                                {
                                    // Open the selected object for write
                                    Entity acEnt = acTrans.GetObject(acSSObj.ObjectId,
                                                                        OpenMode.ForRead) as Entity;
                                    // Get current floor from current layer name
                                    Regex regEx = new Regex(@"\((.)\)", RegexOptions.IgnoreCase);
                                    Match match = regEx.Match(acEnt.Layer.ToString());
                                    if (match.Success)
                                    {
                                        // If current object layer name is the same floor -> OK, than skip object
                                        System.Text.RegularExpressions.Group group = match.Groups[1];
                                        if (group.ToString() != floor)
                                            continue;

                                        // If-else depending on layer name / cfast object type
                                        if (acEnt.Layer.ToString().Contains("room".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.ROOM.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }
                                        else if (acEnt.Layer.ToString().Contains("hole".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.HOLE.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }
                                        else if (acEnt.Layer.ToString().Contains("corridor".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.COR.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }
                                        else if (acEnt.Layer.ToString().Contains("dplain".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.D.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }
                                        else if (acEnt.Layer.ToString().Contains("dcloser".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.C.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }
                                        else if (acEnt.Layer.ToString().Contains("delectric".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.E.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }
                                        else if (acEnt.Layer.ToString().Contains("inlet".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.I.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }
                                        else if (acEnt.Layer.ToString().Contains("window".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.W.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }
                                        else if (acEnt.Layer.ToString().Contains("vvent".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.VNT.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }
                                        else if (acEnt.Layer.ToString().Contains("staircase".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.STAI.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }
                                        else if (acEnt.Layer.ToString().Contains("hall".ToUpper()))
                                        {
                                            try
                                            {
                                                double[] min = GetMin(acEnt);
                                                double[] max = GetMax(acEnt);
                                                cfastObject.HALL.Add(new List<Object> { min, max });
                                            }
                                            catch (System.Exception e)
                                            {
                                                ed.WriteMessage(e.ToString());
                                            }
                                        }

                                    }
                                }

                                Cfast[floor] = cfastObject;
                            }
                        }
                    }
                    // Dispose of the transaction

                    //ed.WriteMessage(JsonConvert.SerializeObject(cfastObject, Formatting.Indented).ToString());
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage(e.ToString());
            }

            /*
            // Set a variable to the My Documents path.
            string mydocpath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

            var psfo = new PromptSaveFileOptions("Export Json file");
            psfo.Filter = "Json (*.json)|*.json";
            var pr = ed.GetFileNameForSave(psfo);

            if (pr.Status != PromptStatus.OK)
                return;

            var json = pr.StringResult;

            // Append text to an existing file named "WriteLines.txt".
            using (StreamWriter outputFile = new StreamWriter(json))
            {
                string jsonF = JsonConvert.SerializeObject(Cfast, Formatting.Indented);
                outputFile.WriteLine(jsonF);
            }
            */

            try
            {
                ed.WriteMessage("\nSending CFAST objects ...");
                acWebSocketMessage message = new acWebSocketMessage("success", "cExport", JsonConvert.SerializeObject(Cfast), null);
                ed.WriteMessage("\nMessageId: " + message.getId());

                acWebSocketMessage answer = acWebSocketCtrl.syncCtrl.sendMessageAndWaitSync(message);
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nWizFDS exception:\n" + e.ToString());
            }
        }

    }
}
