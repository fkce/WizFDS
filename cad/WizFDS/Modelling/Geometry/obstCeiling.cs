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
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
#endif


using System;
using System.Collections.Generic;
using System.Windows;

namespace WizFDS.Modelling.Geometry
{
    public class ObstCeiling
    {
        double zMinOld = 3.0;
        // ??? w utils zrobic initialize metode i tam ustawiac snapunit
        double hCeilOld = 0.2;

        [CommandMethod("fCEILING")]
        public void fCEILING() {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Utils.Utils.Init();
                if (!Utils.Layers.CurrentLayer().Contains("OBST")) Utils.Layers.SetLayerForCurrentFloor("!FDS_OBST[concrete]");
                List<ObjectId> ceilingList = new List<ObjectId>();

                PromptDoubleOptions hCeilO = new PromptDoubleOptions("\nEnter ceiling height:");
                hCeilO.DefaultValue = hCeilOld;
                PromptDoubleResult hCeil = ed.GetDouble(hCeilO);
                if (hCeil.Status != PromptStatus.OK || hCeil.Status == PromptStatus.Cancel) return;
                hCeilOld = hCeil.Value;

                while (true)
                {
                    PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter ceiling Z-min level:");
                    zMinO.DefaultValue = zMinOld;
                    PromptDoubleResult zMin = ed.GetDouble(zMinO);
                    if (zMin.Status != PromptStatus.OK || zMin.Status == PromptStatus.Cancel) break;
                    zMinOld = zMin.Value;
                    Utils.Utils.SetUCS(zMin.Value);

                    while (true)
                    {
                        PromptPointOptions p1Option = new PromptPointOptions("\nSpecify ceiling first corner or ");
                        p1Option.Keywords.Add("Z-min");
                        p1Option.AllowNone = false;
                        PromptPointResult p1 = ed.GetPoint(p1Option);
                        if(p1.Status == PromptStatus.Keyword && p1.StringResult == "Z-min")
                        {
                                zMin = ed.GetDouble(zMinO);
                                if (zMin.Status != PromptStatus.OK || zMin.Status == PromptStatus.Cancel) break;
                                zMinOld = zMin.Value;
                                Utils.Utils.SetUCS(zMin.Value);
                        }
                        else if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) break;
                        else
                        {
                            var p2 = ed.GetUcsCorner("\nPick ceiling opposite corner:", p1.Value);
                            if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) break;
                            ceilingList.Add(Utils.Utils.CreateBox(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMin.Value + hCeil.Value),true));
                        }
                    }
                }
                foreach(ObjectId ent in ceilingList)
                {
                    ed.WriteMessage("\nObjID: " + ent.ToString());

                }


                List<Extents3d> roomRectList = new List<Extents3d>();

                // Select all elements
                // Get the current document and database
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                // Start a transaction
                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    // Step through the objects in the selection set
                    foreach (ObjectId ent in ceilingList)
                    {
                        // Check to make sure a valid SelectedObject object was returned
                        if (ent != null)
                        {
                            // Open the selected object for write
                            Entity acEnt = acTrans.GetObject(ent, OpenMode.ForRead) as Entity;
                            roomRectList.Add(acEnt.GeometricExtents);
                        }
                    }
                }

                //ed.WriteMessage("\n" + roomRectList.Count.ToString());
                int i = 0;
                Rect rootRoom = new Rect();
                Rect nextRoom = new Rect();
                Extents3d roomNext = new Extents3d();
                double minZ = 0;

                foreach (Extents3d room in roomRectList)
                {
                    //if (roomRectList.Count - 1 == i) break;
                    //ed.WriteMessage("\n\n\nRoot room: " + roomRectList[i].ToString());

                    rootRoom = new Rect(new Point(Math.Round(room.MinPoint.X, 4), Math.Round(room.MinPoint.Y, 4)), new Point(Math.Round(room.MaxPoint.X, 4), Math.Round(room.MaxPoint.Y, 4)));

                    for (int j = 0; j < roomRectList.Count; j++)
                    {
                        roomNext = roomRectList[j];
                        //ed.WriteMessage("\nNext room: " + roomRectList[j].ToString());
                        nextRoom = new Rect(new Point(Math.Round(roomRectList[j].MinPoint.X, 4), Math.Round(roomRectList[j].MaxPoint.Y, 4)), new Point(Math.Round(roomRectList[j].MaxPoint.X, 4), Math.Round(roomRectList[j].MinPoint.Y, 4)));
                        if (rootRoom == nextRoom) continue;

                        //if (rootRoom.IntersectsWith(nextRoom) && (room.MinPoint.Z < roomNext.MaxPoint.Z && room.MaxPoint.Z > roomNext.MinPoint.Z))
                        if (rootRoom.IntersectsWith(nextRoom))
                        {
                            Rect res = Rect.Intersect(rootRoom, nextRoom);
                            // Sprawdzić lub równe
                            // Jezeli analizowany strop jest powyzej kolejnego stropu
                            if (room.MinPoint.Z > roomNext.MaxPoint.Z) minZ = roomNext.MaxPoint.Z;
                            else continue;

                            ed.WriteMessage("\n\n--------------------------------");
                            ed.WriteMessage("\nTopLeft.X: " + Math.Round(res.TopLeft.X, 4).ToString());
                            ed.WriteMessage("\nBottomRight.X: " + Math.Round(res.BottomRight.X, 4).ToString());

                            ed.WriteMessage("\nRoomMin.X: " + Math.Round(room.MinPoint.X, 4).ToString());
                            ed.WriteMessage("\nRoomMax.X: " + Math.Round(room.MaxPoint.X, 4).ToString());

                            ed.WriteMessage("\nTopLeft.Y: " + Math.Round(res.TopLeft.Y, 4).ToString());
                            ed.WriteMessage("\nBottomRight.Y: " + Math.Round(res.BottomRight.Y, 4).ToString());

                            ed.WriteMessage("\nRoomMin.Y: " + Math.Round(room.MinPoint.Y, 4).ToString());
                            ed.WriteMessage("\nRoomMax.Y: " + Math.Round(room.MaxPoint.Y, 4).ToString());

                            ObjectId objId;
                            if (Math.Round(res.TopLeft.X, 4) == Math.Round(res.BottomRight.X, 4))
                            {
                                ed.WriteMessage("\nIf 1");

                                if (Math.Round(res.TopLeft.X, 4) == Math.Round(room.MaxPoint.X, 4))
                                {
                                    objId = Utils.Utils.CreateBox(res.TopLeft.X, res.TopLeft.X + hCeil.Value, res.TopLeft.Y, res.BottomRight.Y, minZ, room.MaxPoint.Z, true);
                                    Utils.Xdata.SaveXdata("verticalCeiling", objId);
                                    ed.WriteMessage("\nIf 1a");
                                }
                                else if (Math.Round(res.TopLeft.X, 4) == Math.Round(room.MinPoint.X, 4))
                                {
                                    objId = Utils.Utils.CreateBox(res.TopLeft.X - hCeil.Value, res.TopLeft.X, res.TopLeft.Y, res.BottomRight.Y, minZ, room.MaxPoint.Z, true);
                                    Utils.Xdata.SaveXdata("verticalCeiling", objId);
                                    ed.WriteMessage("\nIf 1b");
                                }
                            }
                            else if (Math.Round(res.TopLeft.Y, 4) == Math.Round(res.BottomRight.Y, 4))
                            {
                                ed.WriteMessage("\nIf 2");
                                if (Math.Round(res.TopLeft.Y, 4) == Math.Round(room.MaxPoint.Y, 4))
                                {
                                    objId = Utils.Utils.CreateBox(res.TopLeft.X, res.BottomRight.X, res.TopLeft.Y, res.TopLeft.Y + hCeil.Value, minZ, room.MaxPoint.Z, true);
                                    Utils.Xdata.SaveXdata("verticalCeiling", objId);
                                    ed.WriteMessage("\nIf 2a");
                                }
                                else if (Math.Round(res.TopLeft.Y, 4) == Math.Round(room.MinPoint.Y, 4))
                                {
                                    objId = Utils.Utils.CreateBox(res.TopLeft.X, res.BottomRight.X, res.TopLeft.Y - hCeil.Value, res.TopLeft.Y, minZ, room.MaxPoint.Z, true);
                                    Utils.Xdata.SaveXdata("verticalCeiling", objId);
                                    ed.WriteMessage("\nIf 2b");
                                }
                            }
                            //ed.WriteMessage("\n\t\tCommon part: " + res.TopLeft.ToString() + " ; " + res.BottomRight.ToString());
                            //ed.WriteMessage("\n\t\tZ coords: " + minZ.ToString() + "," + maxZ.ToString());
                            //ed.WriteMessage("\n\t\tZ crossSection: " + crossSection.ToString() + ", coordinate: " + coordinate);
                            //Utils.Utils.UtilsCreateSurfaceinDB(new Point3d(res.TopLeft.X, res.TopLeft.Y, minZ), new Point3d(res.BottomRight.X, res.BottomRight.Y, maxZ), crossSection, coordinate);
                        }
                        i++;
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

    }
}
