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
#endif

using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Windows;

namespace WizFDS.Cfast
{
    public class Cfast
    {
        double zMinOld = 0.0;
        double zMaxOld = 3.0;

        double hDoorOld = 2.0;
        double zMaxDoorOld = 2.0;

        double zMinWindowOld = 1.0;
        double zMaxWindowOld = 2.0;
        double hWindowOld = 1.0;

        double zMinHoleOld = 1.0;
        double zMaxHoleOld = 2.0;
        double hHoleOld = 1.0;

        int currentFloor = 0;

        double areaOld;

        Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;

        [CommandMethod("cROOM")]
        public void cROOM()
        {
            try
            {
                Utils.Utils.InitCfast();
                Utils.Layers.SetLayerForCurrentFloor("!CFAST_ROOM");
                // Box height
                double H = 0;

                // Get Z-min level
                PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter ROOM Z-min level:");
                zMinO.DefaultValue = zMinOld;
                PromptDoubleResult zMin = ed.GetDouble(zMinO);
                if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                zMinOld = zMin.Value;
                Utils.Utils.SetUCS(zMin.Value);

                // Check if Z-max is less then Z-min
                while (true)
                {
                    PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter ROOM Z-max level:");
                    zMaxO.DefaultValue = zMaxOld;
                    PromptDoubleResult zMax = ed.GetDouble(zMaxO);
                    zMaxOld = zMax.Value;
                    if (zMax.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                    if (zMax.Value <= zMin.Value)
                    {
                        ed.WriteMessage("\nZ-max level should be greater than Z-min level");
                    }
                    else
                    {
                        H = zMax.Value - zMin.Value;
                        break;
                    }
                }

                PromptPointOptions p1O = new PromptPointOptions("\nPick ROOM first corner or ");
                p1O.Keywords.Add("Corridor");
                p1O.Keywords.Add("Hall");
                p1O.Keywords.Add("Staircase");
                PromptPointResult p1;
                while (true)
                {
                    p1 = ed.GetPoint(p1O);
                    if (p1.Status == PromptStatus.Cancel)
                    {
                        break;
                    }
                    if (p1.Status == PromptStatus.Keyword)
                    {
                        switch (p1.StringResult)
                        {
                            case "Staircase":
                                Staircase(H, zMin.Value);
                                break;
                            case "Corridor":
                                Corridor(H, zMin.Value);
                                break;
                            case "Hall":
                                Hall(H, zMin.Value);
                                break;
                        }
                    }
                    else if (p1.Status != PromptStatus.OK) break;
                    else
                    {
                        while (true)
                        {
                            var p2 = ed.GetUcsCorner("\nPick ROOM opposite corner: ", p1.Value);
                            if (p2.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                            if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                            {
                                Utils.Utils.CreateBox(p1.Value, p2.Value, H, zMin.Value);
                                break;
                            }
                            else
                            {
                                ed.WriteMessage("\nPick correct corner!");
                            }
                        }
                    }
                }
                Utils.Utils.End();
                return;
            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("WizFDS exception: " + e.ToString());
            }
        }

        [CommandMethod("cCORRIDOR")]
        public void Corridor()
        {
            try
            {
                Utils.Utils.InitCfast();
                // Change layer to room if current layer is 0
                Utils.Layers.SetLayer("!CFAST_CORRIDOR(0)");

                // Get current floor from current layer name
                Regex regEx = new Regex(@"\((.)\)", RegexOptions.IgnoreCase);
                Match match = regEx.Match(Utils.Layers.CurrentLayer());
                if (match.Success)
                {
                    System.Text.RegularExpressions.Group group = match.Groups[1];
                    ed.WriteMessage(group.ToString());
                    Int32.TryParse(group.ToString(), out currentFloor);
                }

                // Box height
                double H = 0;

                // Get Z-min level
                PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter Z-min level:");
                zMinO.DefaultValue = zMinOld;
                PromptDoubleResult zMin = ed.GetDouble(zMinO);
                if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                zMinOld = zMin.Value;
                Utils.Utils.SetUCS(zMin.Value);

                // Check if Z-max is less then Z-min
                while (true)
                {
                    PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter Z-max level:");
                    zMaxO.DefaultValue = zMaxOld;
                    PromptDoubleResult zMax = ed.GetDouble(zMaxO);
                    zMaxOld = zMax.Value;
                    if (zMax.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                    if (zMax.Value <= zMin.Value)
                    {
                        ed.WriteMessage("\nZ-max level should be greater than Z-min level");
                    }
                    else
                    {
                        H = zMax.Value - zMin.Value;
                        break;
                    }
                }

                Utils.Layers.SetLayer("!CFAST_CORRIDOR(" + currentFloor.ToString() + ")");
                string currentLayer = Utils.Layers.CurrentLayer();
                PromptPointOptions p1O = new PromptPointOptions("\nPick CORRIDOR first corner");
                PromptPointResult p1;
                while (true)
                {
                    p1 = ed.GetPoint(p1O);
                    if (p1.Status == PromptStatus.Cancel)
                    {
                        Utils.Layers.SetLayer(currentLayer);
                        break;
                    }
                    else if (p1.Status != PromptStatus.OK) break;
                    else
                    {
                        while (true)
                        {
                            var p2 = ed.GetUcsCorner("\nPick CORRIDOR opposite corner: ", p1.Value);
                            if (p2.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                            if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                            {
                                Utils.Utils.CreateBox(p1.Value, p2.Value, H, zMin.Value);
                                break;
                            }
                            else
                            {
                                ed.WriteMessage("\nPick correct corner!");
                            }
                        }
                    }
                }
                Utils.Layers.SetLayer(currentLayer);
                return;
            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("WizFDS exception: " + e.ToString());
            }
        }
        void Corridor(double H, double zMin)
        {
            try
            {
                string currentLayer = Utils.Layers.CurrentLayer();
                Utils.Layers.SetLayerForCurrentFloor("!CFAST_CORRIDOR");
                PromptPointOptions p1O = new PromptPointOptions("\nPick CORRIDOR first corner");
                PromptPointResult p1;
                while (true)
                {
                    p1 = ed.GetPoint(p1O);
                    if (p1.Status == PromptStatus.Cancel)
                    {
                        Utils.Layers.SetLayer(currentLayer);
                        break;
                    }
                    else if (p1.Status != PromptStatus.OK) break;
                    else
                    {
                        while (true)
                        {
                            var p2 = ed.GetUcsCorner("\nPick wall opposite corner: ", p1.Value);
                            if (p2.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                            if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                            {
                                Utils.Utils.CreateBox(p1.Value, p2.Value, H, zMin);
                                break;
                            }
                            else
                            {
                                ed.WriteMessage("\nPick correct corner!");
                            }
                        }
                    }
                }
                Utils.Layers.SetLayer(currentLayer);
                return;
            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("WizFDS exception: " + e.ToString());
            }
        }

        [CommandMethod("cSTAIRCASE")]
        public void Staircase()
        {
            try
            {
                Utils.Utils.InitCfast();
                // Change layer to room if current layer is 0
                Utils.Layers.SetLayerForCurrentFloor("!CFAST_STAIRCASE");

                // Box height
                double H = 0;

                // Get Z-min level
                PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter Z-min level:");
                zMinO.DefaultValue = zMinOld;
                PromptDoubleResult zMin = ed.GetDouble(zMinO);
                if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                zMinOld = zMin.Value;
                Utils.Utils.SetUCS(zMin.Value);

                // Check if Z-max is less then Z-min
                while (true)
                {
                    PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter Z-max level:");
                    zMaxO.DefaultValue = zMaxOld;
                    PromptDoubleResult zMax = ed.GetDouble(zMaxO);
                    zMaxOld = zMax.Value;
                    if (zMax.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                    if (zMax.Value <= zMin.Value)
                    {
                        ed.WriteMessage("\nZ-max level should be greater than Z-min level");
                    }
                    else
                    {
                        H = zMax.Value - zMin.Value;
                        break;
                    }
                }
                PromptPointOptions p1O = new PromptPointOptions("\nPick STAIRCASE first corner");
                PromptPointResult p1;
                while (true)
                {
                    p1 = ed.GetPoint(p1O);
                    if (p1.Status == PromptStatus.Cancel)
                    {
                        Utils.Utils.End();
                        break;
                    }
                    else if (p1.Status != PromptStatus.OK) { Utils.Utils.End(); break; }
                    else
                    {
                        while (true)
                        {
                            var p2 = ed.GetUcsCorner("\nPick STAIRCASE opposite corner: ", p1.Value);
                            if (p2.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                            if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                            {
                                Utils.Utils.CreateBox(p1.Value, p2.Value, H, zMin.Value);
                                break;
                            }
                            else
                            {
                                ed.WriteMessage("\nPick correct corner!");
                            }
                        }
                    }
                }
                Utils.Utils.End();
                return;
            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("WizFDS exception: " + e.ToString());
            }
        }
        void Staircase(double H, double zMin)
        {
            try
            {
                string currentLayer = Utils.Layers.CurrentLayer();
                Utils.Layers.SetLayerForCurrentFloor("!CFAST_STAIRCASE");
                PromptPointOptions p1O = new PromptPointOptions("\nPick STAIRCASE first point");
                PromptPointResult p1;
                while (true)
                {
                    p1 = ed.GetPoint(p1O);
                    if (p1.Status == PromptStatus.Cancel)
                    {
                        Utils.Layers.SetLayer(currentLayer);
                        break;
                    }
                    else if (p1.Status != PromptStatus.OK) break;
                    else
                    {
                        while (true)
                        {
                            var p2 = ed.GetUcsCorner("\nPick STAIRCASE opposite corner: ", p1.Value);
                            if (p2.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                            if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                            {
                                Utils.Utils.CreateBox(p1.Value, p2.Value, H, zMin);
                                break;
                            }
                            else
                            {
                                ed.WriteMessage("\nPick correct corner!");
                            }
                        }
                    }
                }
                Utils.Layers.SetLayer(currentLayer);
                return;
            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("WizFDS exception: " + e.ToString());
            }
        }

        [CommandMethod("cHALL")]
        public void Hall()
        {
            Utils.Utils.InitCfast();
            // Change layer to room if current layer is 0
            Utils.Layers.SetLayerForCurrentFloor("!CFAST_HALL");

            // Box height
            double H = 0;

            // Get Z-min level

            PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter Z-min level:");
            zMinO.DefaultValue = zMinOld;
            PromptDoubleResult zMin = ed.GetDouble(zMinO);
            if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
            zMinOld = zMin.Value;
            Utils.Utils.SetUCS(zMin.Value);

            // Check if Z-max is less then Z-min
            while (true)
            {
                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter Z-max level:");
                zMaxO.DefaultValue = zMaxOld;
                PromptDoubleResult zMax = ed.GetDouble(zMaxO);
                zMaxOld = zMax.Value;
                if (zMax.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                if (zMax.Value <= zMin.Value)
                {
                    ed.WriteMessage("\nZ-max level should be greater than Z-min level");
                }
                else
                {
                    H = zMax.Value - zMin.Value;
                    break;
                }
            }
            PromptPointOptions p1O = new PromptPointOptions("\nPick HALL first corner");
            PromptPointResult p1;
            while (true)
            {
                p1 = ed.GetPoint(p1O);
                if (p1.Status == PromptStatus.Cancel) break;
                else if (p1.Status != PromptStatus.OK) break;
                else
                {
                    while (true)
                    {
                        var p2 = ed.GetUcsCorner("\nPick HALL opposite corner: ", p1.Value);
                        if (p2.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                        if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                        {
                            Utils.Utils.CreateBox(p1.Value, p2.Value, H, zMin.Value);
                            break;
                        }
                        else
                        {
                            ed.WriteMessage("\nPick correct corner!");
                        }
                    }
                }
            }
            Utils.Utils.End();
            return;
        }
        void Hall(double H, double zMin)
        {
            try
            {
                string currentLayer = Utils.Layers.CurrentLayer();
                Utils.Layers.SetLayerForCurrentFloor("!CFAST_HALL");
                PromptPointOptions p1O = new PromptPointOptions("\nPick HALL first corner");
                PromptPointResult p1;
                while (true)
                {
                    p1 = ed.GetPoint(p1O);
                    if (p1.Status == PromptStatus.Cancel)
                    {
                        Utils.Layers.SetLayer(currentLayer);
                        break;
                    }
                    else if (p1.Status != PromptStatus.OK) break;
                    else
                    {
                        while (true)
                        {
                            var p2 = ed.GetUcsCorner("\nPick HALL opposite corner: ", p1.Value);
                            if (p2.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                            if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                            {
                                Utils.Utils.CreateBox(p1.Value, p2.Value, H, zMin);
                                break;
                            }
                            else
                            {
                                ed.WriteMessage("\nPick correct corner!");
                            }
                        }
                    }
                }
                Utils.Layers.SetLayer(currentLayer);
                return;
            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("WizFDS exception: " + e.ToString());
            }
        }

        [CommandMethod("cDOOR")]
        public void cDOOR()
        {
            try
            {
                Utils.Utils.InitCfast();

                // Get Z-min level
                PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter DOOR Z-min level:");
                zMinO.DefaultValue = zMinOld;
                PromptDoubleResult zMin = ed.GetDouble(zMinO);
                if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                zMinOld = zMin.Value;
                Utils.Utils.SetUCS(zMin.Value);

                // Get Z-max level
                double hVal = hDoorOld;
                double zMaxVal = zMaxDoorOld;
                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter DOOR Z-max level or ");
                zMaxO.DefaultValue = zMaxDoorOld;
                zMaxO.Keywords.Add("Height");
                PromptDoubleResult zMax = ed.GetDouble(zMaxO);
                ed.WriteMessage(zMax.Status.ToString());
                if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                {
                    PromptDoubleOptions hO = new PromptDoubleOptions("\nEnter DOOR height level:");
                    PromptDoubleResult h = ed.GetDouble(hO);
                    if (h.Status == PromptStatus.OK)
                    {
                        hVal = h.Value;
                        zMaxVal = zMin.Value + h.Value;
                        hDoorOld = h.Value;
                        zMaxDoorOld = zMaxVal;
                    }
                }
                else if (zMax.Status != PromptStatus.OK) return;
                else
                {
                    hVal = zMax.Value - zMin.Value;
                    zMaxVal = zMax.Value;
                    hDoorOld = zMax.Value - zMin.Value;
                    zMaxDoorOld = zMaxVal;
                }

                while (true)
                {
                    PromptKeywordOptions typeOptions = new PromptKeywordOptions("\nChoose DOOR type");
                    typeOptions.Keywords.Add("Plain");
                    typeOptions.Keywords.Add("Closer");
                    typeOptions.Keywords.Add("Electric");
                    typeOptions.Keywords.Default = "Plain";
                    typeOptions.AllowNone = false;
                    PromptResult type = ed.GetKeywords(typeOptions);

                    if (type.Status != PromptStatus.OK || type.Status == PromptStatus.Cancel) break;
                    if (type.Status == PromptStatus.OK)
                    {
                        if (type.StringResult == "Plain")
                        {
                            Utils.Layers.SetLayerForCurrentFloor("!CFAST_DPLAIN");
                            Door(zMin.Value, zMaxVal);
                        }
                        else if (type.StringResult == "Closer")
                        {
                            Utils.Layers.SetLayerForCurrentFloor("!CFAST_DCLOSER");
                            Door(zMin.Value, zMaxVal);
                        }
                        else if (type.StringResult == "Electric")
                        {
                            Utils.Layers.SetLayerForCurrentFloor("!CFAST_DELECTRIC");
                            Door(zMin.Value, zMaxVal);
                        }
                    }
                }

                Utils.Utils.End();

            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("\nProgram exception: " + e.ToString());
                Utils.Utils.End();
            }

        }
        void Door(double zMin, double zMax)
        {
            try
            {
                Utils.Utils.SetOrtho(true);
                while (true)
                {
                    PromptPointOptions p1O = new PromptPointOptions("\nPick DOOR first point");
                    PromptPointResult p1 = ed.GetPoint(p1O);
                    if (p1.Status == PromptStatus.Cancel) return;
                    if (p1.Status != PromptStatus.OK) return;
                    while (true)
                    {
                        PromptPointOptions p2Option = new PromptPointOptions("\nPick DOOR second point");
                        p2Option.AllowNone = false;
                        p2Option.UseBasePoint = true;
                        p2Option.BasePoint = p1.Value;
                        PromptPointResult p2 = ed.GetPoint(p2Option);
                        if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) break;
                        if (p1.Value.X == p2.Value.X)
                        {
                            Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin), new Point3d(p2.Value.X, p2.Value.Y, zMax));
                            break;
                        }
                        else if (p1.Value.Y == p2.Value.Y)
                        {
                            Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin), new Point3d(p2.Value.X, p2.Value.Y, zMax));
                            break;
                        }
                        else
                        {
                            ed.WriteMessage("\nPick correct points in ortho mode!");
                        }
                    }
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("Program exception: " + e.ToString());
                return;
            }
        }

        [CommandMethod("cWINDOW")]
        public void cWINDOW()
        {
            try
            {
                Utils.Utils.InitCfast();

                // Get Z-min level
                PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter WINDOW Z-min level:");
                zMinO.DefaultValue = zMinWindowOld;
                PromptDoubleResult zMin = ed.GetDouble(zMinO);
                if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                zMinWindowOld = zMin.Value;
                Utils.Utils.SetUCS(zMin.Value);

                // Get Z-max level
                double hVal = hWindowOld;
                double zMaxVal = zMaxWindowOld;
                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter WINDOW Z-max level or ");
                zMaxO.DefaultValue = zMaxWindowOld;
                zMaxO.Keywords.Add("Height");
                PromptDoubleResult zMax = ed.GetDouble(zMaxO);
                ed.WriteMessage(zMax.Status.ToString());
                if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                {
                    PromptDoubleOptions hO = new PromptDoubleOptions("\nEnter WINDOW height level:");
                    PromptDoubleResult h = ed.GetDouble(hO);
                    if (h.Status == PromptStatus.OK)
                    {
                        hVal = h.Value;
                        zMaxVal = zMin.Value + h.Value;
                        hWindowOld = h.Value;
                        zMaxWindowOld = zMaxVal;
                    }
                }
                else if (zMax.Status != PromptStatus.OK) return;
                else
                {
                    hVal = zMax.Value - zMin.Value;
                    zMaxVal = zMax.Value;
                    hWindowOld = zMax.Value - zMin.Value;
                    zMaxWindowOld = zMaxVal;
                }

                Utils.Layers.SetLayerForCurrentFloor("!CFAST_WINDOW");
                Window(zMin.Value, zMaxVal);

                Utils.Utils.End();
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nWizFDS exception: " + e.ToString());
                Utils.Utils.End();
            }

        }
        void Window(double zMin, double zMax)
        {
            try
            {
                Utils.Utils.SetOrtho(true);
                while (true)
                {
                    PromptPointOptions p1O = new PromptPointOptions("\nPick WINDOW first point");
                    PromptPointResult p1 = ed.GetPoint(p1O);
                    if (p1.Status == PromptStatus.Cancel) return;
                    if (p1.Status != PromptStatus.OK) return;
                    while (true)
                    {
                        PromptPointOptions p2Option = new PromptPointOptions("\nPick WINDOW second point");
                        p2Option.AllowNone = false;
                        p2Option.UseBasePoint = true;
                        p2Option.BasePoint = p1.Value;
                        PromptPointResult p2 = ed.GetPoint(p2Option);
                        if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) break;
                        if (p1.Value.X == p2.Value.X)
                        {
                            Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin), new Point3d(p2.Value.X, p2.Value.Y, zMax));
                            break;
                        }
                        else if (p1.Value.Y == p2.Value.Y)
                        {
                            Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin), new Point3d(p2.Value.X, p2.Value.Y, zMax));
                            break;
                        }
                        else
                        {
                            ed.WriteMessage("\nPick correct points in ortho mode!");
                        }
                    }
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("Program exception: " + e.ToString());
                return;
            }
        }

        [CommandMethod("cVVENT")]
        public void cVVENT()
        {
            try
            {
                Utils.Utils.InitCfast();
                Utils.Layers.SetLayerForCurrentFloor("!CFAST_VVENT");
                Extents3d ext = Utils.Utils.GetAllElementsBoundingBox();
                while (true)
                {
                    PromptDoubleOptions zlevelOption = new PromptDoubleOptions("Enter VENT Z-level (min: " + ext.MinPoint.Z + ", max: " + ext.MaxPoint.Z + ")");
                    zlevelOption.AllowNone = false;
                    zlevelOption.DefaultValue = 3.0;
                    PromptDoubleResult zlevel = ed.GetDouble(zlevelOption);
                    if (zlevel.Status != PromptStatus.OK || zlevel.Status == PromptStatus.Cancel) break;
                    if (zlevel.Status == PromptStatus.OK)
                    {
                        while (true)
                        {
                            PromptPointOptions p1Option = new PromptPointOptions("\nPick VENT first corner:");
                            p1Option.AllowNone = false;
                            PromptPointResult p1 = ed.GetPoint(p1Option);
                            if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) break;

                            var p2 = ed.GetUcsCorner("Pick VENT opposite corner:", p1.Value);
                            if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) break;
                            Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zlevel.Value), new Point3d(p2.Value.X, p2.Value.Y, zlevel.Value));
                        }
                    }
                }
                Utils.Utils.End();
            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("Program exception: " + e.ToString());
            }
        }

        [CommandMethod("cINLET")]
        public void cINLET()
        {
            try
            {
                while (true)
                {
                    PromptKeywordOptions orientationOptions = new PromptKeywordOptions("\nChoose orientation");
                    orientationOptions.Keywords.Add("Horizontal");
                    orientationOptions.Keywords.Add("Vertical");
                    orientationOptions.AllowNone = false;
                    PromptResult orientation = ed.GetKeywords(orientationOptions);

                    if (orientation.Status != PromptStatus.OK || orientation.Status == PromptStatus.Cancel) { Utils.Utils.End(); return; };
                    if (orientation.Status == PromptStatus.OK)
                    {
                        if (orientation.StringResult == "Horizontal")
                        {
                            Utils.Utils.InitCfast();

                            // Get Z-min level
                            PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter INLET Z-min level:");
                            zMinO.DefaultValue = zMinHoleOld;
                            PromptDoubleResult zMin = ed.GetDouble(zMinO);
                            if (zMin.Status != PromptStatus.OK) { goto End; }
                            zMinHoleOld = zMin.Value;
                            Utils.Utils.SetUCS(zMin.Value);

                            // Get Z-max level
                            double hVal = hHoleOld;
                            double zMaxVal = zMaxHoleOld;
                            PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter INLET Z-max level or ");
                            zMaxO.DefaultValue = zMaxHoleOld;
                            zMaxO.Keywords.Add("Height");
                            PromptDoubleResult zMax = ed.GetDouble(zMaxO);
                            ed.WriteMessage(zMax.Status.ToString());
                            if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                            {
                                PromptDoubleOptions hO = new PromptDoubleOptions("\nEnter INLET height level:");
                                PromptDoubleResult h = ed.GetDouble(hO);
                                if (h.Status == PromptStatus.OK)
                                {
                                    hVal = h.Value;
                                    zMaxVal = zMin.Value + h.Value;
                                    hHoleOld = h.Value;
                                    zMaxHoleOld = zMaxVal;
                                }
                            }
                            else if (zMax.Status != PromptStatus.OK) goto End;
                            else
                            {
                                hVal = zMax.Value - zMin.Value;
                                zMaxVal = zMax.Value;
                                hHoleOld = zMax.Value - zMin.Value;
                                zMaxHoleOld = zMaxVal;
                            }

                            Utils.Layers.SetLayerForCurrentFloor("!CFAST_INLET");
                            Utils.Utils.SetUCS(zMin.Value);
                            Utils.Utils.SetOrtho(true);
                            while (true)
                            {
                                PromptPointOptions p1O = new PromptPointOptions("\nPick INLET first point");
                                PromptPointResult p1 = ed.GetPoint(p1O);
                                if (p1.Status == PromptStatus.Cancel) goto End;
                                if (p1.Status != PromptStatus.OK) goto End;
                                while (true)
                                {
                                    PromptPointOptions p2Option = new PromptPointOptions("\nPick INLET second point:");
                                    p2Option.AllowNone = false;
                                    p2Option.UseBasePoint = true;
                                    p2Option.BasePoint = p1.Value;
                                    PromptPointResult p2 = ed.GetPoint(p2Option);
                                    if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) goto End;
                                    if (p1.Value.X == p2.Value.X)
                                    {
                                        Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMaxVal));
                                        break;
                                    }
                                    else if (p1.Value.Y == p2.Value.Y)
                                    {
                                        Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMaxVal));
                                        break;
                                    }
                                    else
                                    {
                                        ed.WriteMessage("\nPick correct points in ortho mode!");
                                    }
                                }
                            }
                        }
                        else if (orientation.StringResult == "Vertical")
                        {

                            Utils.Utils.InitCfast();
                            Utils.Utils.SetOrtho(false);
                            Utils.Layers.SetLayerForCurrentFloor("!CFAST_INLET");
                            Extents3d ext = Utils.Utils.GetAllElementsBoundingBox();
                            while (true)
                            {
                                PromptDoubleOptions zlevelOption = new PromptDoubleOptions("Enter INLET Z-level (min: " + ext.MinPoint.Z + ", max: " + ext.MaxPoint.Z + ")");
                                zlevelOption.AllowNone = false;
                                zlevelOption.DefaultValue = 3.0;
                                PromptDoubleResult zlevel = ed.GetDouble(zlevelOption);
                                if (zlevel.Status != PromptStatus.OK || zlevel.Status == PromptStatus.Cancel) goto End;
                                if (zlevel.Status == PromptStatus.OK)
                                {
                                    while (true)
                                    {
                                        PromptPointOptions p1Option = new PromptPointOptions("\nPick INLET first corner:");
                                        p1Option.AllowNone = false;
                                        PromptPointResult p1 = ed.GetPoint(p1Option);
                                        if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto End;

                                        var p2 = ed.GetUcsCorner("Pick INLET opposite corner:", p1.Value);
                                        if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) goto End;
                                        Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zlevel.Value), new Point3d(p2.Value.X, p2.Value.Y, zlevel.Value));
                                    }
                                }
                            }
                        }
                    }
                End:;
                }
            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("WizFDS exception: " + e.ToString());
                return;
            }
        }

        [CommandMethod("cHOLE")]
        public void cHOLE()
        {
            Utils.Utils.InitCfast();
            // Change layer to room if current layer is 0
            Utils.Layers.SetLayerForCurrentFloor("!CFAST_HOLE");

            try
            {
                List<Extents3d> roomRectList = new List<Extents3d>();

                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                Database acCurDb = acDoc.Database;

                using (Transaction acTrans = acCurDb.TransactionManager.StartTransaction())
                {
                    PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter WINDOW Z-min level:");
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
                                Entity acEnt = acTrans.GetObject(acSSObj.ObjectId, OpenMode.ForRead) as Entity;
                                roomRectList.Add(acEnt.GeometricExtents);
                            }
                        }
                    }
                }

                int i = 0;
                Rect rootRoom = new Rect();
                Rect nextRoom = new Rect();
                Extents3d roomNext = new Extents3d();
                double minZ = 0;
                double maxZ = 0;

                foreach (Extents3d room in roomRectList)
                {
                    if (roomRectList.Count == i) break;

                    rootRoom = new Rect(new Point(Math.Round(room.MinPoint.X, 4), Math.Round(room.MinPoint.Y, 4)), new Point(Math.Round(room.MaxPoint.X, 4), Math.Round(room.MaxPoint.Y, 4)));

                    for (int j = i + 1; j < roomRectList.Count; j++)
                    {
                        roomNext = roomRectList[j];
                        nextRoom = new Rect(new Point(Math.Round(roomRectList[j].MinPoint.X, 4), Math.Round(roomRectList[j].MaxPoint.Y, 4)), new Point(Math.Round(roomRectList[j].MaxPoint.X, 4), Math.Round(roomRectList[j].MinPoint.Y, 4)));
                        if (rootRoom.IntersectsWith(nextRoom) && (room.MinPoint.Z < roomNext.MaxPoint.Z && room.MaxPoint.Z > roomNext.MinPoint.Z))
                        {

                            Rect res = Rect.Intersect(rootRoom, nextRoom);
                            if (room.MinPoint.Z >= roomNext.MinPoint.Z) minZ = room.MinPoint.Z;
                            else minZ = roomNext.MinPoint.Z;

                            if (room.MaxPoint.Z <= roomNext.MaxPoint.Z) maxZ = room.MaxPoint.Z;
                            else maxZ = roomNext.MaxPoint.Z;

                            Utils.Utils.CreateExtrudedSurface(new Point3d(res.TopLeft.X, res.TopLeft.Y, minZ), new Point3d(res.BottomRight.X, res.BottomRight.Y, maxZ));
                        }
                    }
                    i++;
                }
                Utils.Utils.End();
            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("Program exception: " + e.ToString());
            }
        }

        [CommandMethod("cHOLEMAN")]
        public void cHOLEMAN()
        {
            try
            {
                Utils.Utils.InitCfast();

                // Get Z-min level
                PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter HOLE Z-min level:");
                zMinO.DefaultValue = zMinHoleOld;
                PromptDoubleResult zMin = ed.GetDouble(zMinO);
                if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                zMinHoleOld = zMin.Value;
                Utils.Utils.SetUCS(zMin.Value);

                // Get Z-max level
                double hVal = hHoleOld;
                double zMaxVal = zMaxHoleOld;
                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter HOLE Z-max level or ");
                zMaxO.DefaultValue = zMaxHoleOld;
                zMaxO.Keywords.Add("Height");
                PromptDoubleResult zMax = ed.GetDouble(zMaxO);
                //ed.WriteMessage(zMax.Status.ToString());
                if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                {
                    PromptDoubleOptions hO = new PromptDoubleOptions("\nEnter HOLE height level:");
                    PromptDoubleResult h = ed.GetDouble(hO);
                    if (h.Status == PromptStatus.OK)
                    {
                        hVal = h.Value;
                        zMaxVal = zMin.Value + h.Value;
                        hHoleOld = h.Value;
                        zMaxHoleOld = zMaxVal;
                    }
                }
                else if (zMax.Status != PromptStatus.OK) return;
                else
                {
                    hVal = zMax.Value - zMin.Value;
                    zMaxVal = zMax.Value;
                    hHoleOld = zMax.Value - zMin.Value;
                    zMaxHoleOld = zMaxVal;
                }

                Utils.Layers.SetLayerForCurrentFloor("!CFAST_HOLE");
                Utils.Utils.SetUCS(zMin.Value);
                Utils.Utils.SetOrtho(true);
                while (true)
                {
                    PromptPointOptions p1O = new PromptPointOptions("\nPick HOLE first point");
                    PromptPointResult p1 = ed.GetPoint(p1O);
                    if (p1.Status == PromptStatus.Cancel) break;
                    if (p1.Status != PromptStatus.OK) break;
                    while (true)
                    {
                        PromptPointOptions p2Option = new PromptPointOptions("\nPick HOLE second point:");
                        p2Option.AllowNone = false;
                        p2Option.UseBasePoint = true;
                        p2Option.BasePoint = p1.Value;
                        PromptPointResult p2 = ed.GetPoint(p2Option);
                        if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) break;
                        if (p1.Value.X == p2.Value.X)
                        {
                            Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMaxVal));
                            break;
                        }
                        else if (p1.Value.Y == p2.Value.Y)
                        {
                            Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMaxVal));
                            break;
                        }
                        else
                        {
                            ed.WriteMessage("\nPick correct points in ortho mode!");
                        }
                    }
                }
                Utils.Utils.End();
                return;
            }
            catch (System.Exception e)
            {
                Utils.Utils.End();
                ed.WriteMessage("WizFDS exception: " + e.ToString());
                return;
            }
        }

        // New features
        [CommandMethod("cMVENT")]
        public void cMVENT()
        {
            Utils.Utils.InitCfast();
            // Change layer to room if current layer is 0
            string currentLayer = Utils.Layers.CurrentLayer();
            Utils.Layers.SetLayerForCurrentFloor("!CFAST_MVENT");

            // Box height
            double edge = 0;
            double H = 0;

            // Get Z-min level

            PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter Z-min level:");
            zMinO.DefaultValue = zMinOld;
            PromptDoubleResult zMin = ed.GetDouble(zMinO);
            if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
            zMinOld = zMin.Value;
            Utils.Utils.SetUCS(zMin.Value);

            PromptDoubleResult area;
            // Check if Z-max is less then Z-min
            while (true)
            {
                PromptDoubleOptions areaO = new PromptDoubleOptions("\nEnter vent area [m2]:");
                areaO.DefaultValue = areaOld;
                area = ed.GetDouble(areaO);
                areaOld = area.Value;
                if (area.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                if (area.Value <= 0)
                {
                    ed.WriteMessage("\nArea must be positive numer");
                }
                else
                {
                    break;
                }
            }

            Utils.Utils.SetOrtho(true);
            PromptPointOptions p1O = new PromptPointOptions("\nPick first point");
            PromptPointResult p1;
            while (true)
            {
                p1 = ed.GetPoint(p1O);
                if (p1.Status == PromptStatus.Cancel)
                {
                    Utils.Layers.SetLayer(currentLayer);
                    Utils.Utils.End();
                    break;
                }
                else if (p1.Status != PromptStatus.OK) break;
                else
                {
                    while (true)
                    {
                        PromptPointOptions p2O = new PromptPointOptions("\nPick vent opposite corner:");
                        p2O.UseBasePoint = true;
                        p2O.BasePoint = p1.Value;
                        //var p2 = ed.GetUcsCorner("\nPick vent opposite corner: ", p1.Value);
                        var p2 = ed.GetPoint(p2O);
                        if (p2.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                        if (p1.Value.X == p2.Value.X || p1.Value.Y == p2.Value.Y)
                        {
                            if (p1.Value.X == p2.Value.X)
                            {
                                edge = Math.Abs(p2.Value.Y - p1.Value.Y);
                                try
                                {
                                    H = area.Value / edge;
                                    Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMin.Value + H));
                                }
                                catch (System.Exception e)
                                {
                                    ed.WriteMessage(e.ToString());
                                }
                            }
                            else if (p1.Value.Y == p2.Value.Y)
                            {
                                edge = Math.Abs(p2.Value.X - p1.Value.X);
                                try
                                {
                                    H = area.Value / edge;
                                    Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMin.Value + H));
                                }
                                catch (System.Exception e)
                                {
                                    ed.WriteMessage(e.ToString());
                                }
                            }
                            break;
                        }
                        else
                        {
                            ed.WriteMessage("\nPick correct corner in ortho mode!");
                        }
                    }
                }
            }
            Utils.Layers.SetLayer(currentLayer);
            Utils.Utils.End();
            return;
        }

        [CommandMethod("cHVENT")]
        public void cHVENT()
        {
            try
            {
                Utils.Utils.InitCfast();
                // Change layer to room if current layer is 0
                string currentLayer = Utils.Layers.CurrentLayer();
                Utils.Layers.SetLayerForCurrentFloor("!CFAST_HVENT");

                // Vent height
                double edge = 0;
                double H = 0;

                // Get Z-min level - important
                PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter Z-min level:");
                zMinO.DefaultValue = zMinOld;
                PromptDoubleResult zMin = ed.GetDouble(zMinO);
                if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                zMinOld = zMin.Value;
                Utils.Utils.SetUCS(zMin.Value);


                // !!!! Pobierz punkt -> rysuj drugi lub (podaj powierzchnie -> ktory bok -> podaj wymiar boku)

                PromptDoubleResult area;
                // Check if Z-max is less then Z-min
                while (true)
                {
                    PromptDoubleOptions areaO = new PromptDoubleOptions("\nEnter vent area [m2]:");
                    areaO.DefaultValue = areaOld;
                    area = ed.GetDouble(areaO);
                    areaOld = area.Value;
                    if (area.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                    if (area.Value <= 0)
                    {
                        ed.WriteMessage("\nArea must be positive numer");
                    }
                    else
                    {
                        break;
                    }
                }

                Utils.Utils.SetOrtho(true);
                PromptPointOptions p1O = new PromptPointOptions("\nPick first point");
                PromptPointResult p1;
                while (true)
                {
                    p1 = ed.GetPoint(p1O);
                    if (p1.Status == PromptStatus.Cancel)
                    {
                        Utils.Layers.SetLayer(currentLayer);
                        Utils.Utils.End();
                        break;
                    }
                    else if (p1.Status != PromptStatus.OK) break;
                    else
                    {
                        while (true)
                        {
                            PromptPointOptions p2O = new PromptPointOptions("\nPick vent opposite corner:");
                            p2O.UseBasePoint = true;
                            p2O.BasePoint = p1.Value;
                            //var p2 = ed.GetUcsCorner("\nPick vent opposite corner: ", p1.Value);
                            var p2 = ed.GetPoint(p2O);
                            if (p2.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                            if (p1.Value.X == p2.Value.X || p1.Value.Y == p2.Value.Y)
                            {
                                if (p1.Value.X == p2.Value.X)
                                {
                                    edge = Math.Abs(p2.Value.Y - p1.Value.Y);
                                    try
                                    {
                                        H = area.Value / edge;
                                        Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMin.Value + H));
                                    }
                                    catch (System.Exception e)
                                    {
                                        ed.WriteMessage(e.ToString());
                                    }
                                }
                                else if (p1.Value.Y == p2.Value.Y)
                                {
                                    edge = Math.Abs(p2.Value.X - p1.Value.X);
                                    try
                                    {
                                        H = area.Value / edge;
                                        Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMin.Value + H));
                                    }
                                    catch (System.Exception e)
                                    {
                                        ed.WriteMessage(e.ToString());
                                    }
                                }
                                break;
                            }
                            else
                            {
                                ed.WriteMessage("\nPick correct corner in ortho mode!");
                            }
                        }
                    }
                }
                Utils.Layers.SetLayer(currentLayer);
                Utils.Utils.End();
                return;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("Program exception: " + e.ToString());
            }
        }

    }
}
