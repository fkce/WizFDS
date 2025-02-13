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
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.EditorInput;
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
    public class Obst
    {
        double zMinOld = 0.0;
        double zMaxOld = 3.0;
        double heightOld = 3.0;

        double zMaxDoorOld = 2.0;
        double heightDoorOld = 3.0;

        double zMinBeamOld = 2.0;

        double zMinWindowOld = 1.0;
        double zMaxWindowOld = 2.0;
        double heightWindowOld = 1.0;

        double zMinHoleOld = 0.0;
        double zMaxHoleOld = 2.0;
        double heightHoleOld = 1.0;


        /// <summary>
        /// fOBST Command
        /// </summary>
        [CommandMethod("fOBST")]
        public void fOBST(){
            Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
            Utils.Utils.Init();

            if (!Utils.Layers.CurrentLayer().Contains("!FDS_OBST")) 
                Utils.Layers.SetLayerForCurrentFloor("!FDS_OBST[inert]");

            // Get zMin & zMax | height level
            PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter Z-min level:");
            zMinO.DefaultValue = zMinOld;
            PromptDoubleResult zMin = ed.GetDouble(zMinO);
            if (zMin.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
            zMinOld = zMin.Value;
            Utils.Utils.SetUCS(zMin.Value);

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
            
            PromptPointOptions p1O = new PromptPointOptions("\nSpecify first point or ");
            p1O.Keywords.Add("Door");
            p1O.Keywords.Add("Beam");
            p1O.Keywords.Add("Window");
            p1O.Keywords.Add("Slant");
            p1O.Keywords.Add("Hole");
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
                        case "Door":
                            Door(height, zMin);
                            break;
                        case "Beam":
                            Beam(height, zMin);
                            break;
                        case "Window":
                            Window(height, zMin);
                            break;
                        case "Slant":
                            Slant(height, zMin);
                            break;
                        case "Hole":
                            Hole(zMin);
                            break;
                    }
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
                            Utils.Utils.CreateBox(p1.Value, p2.Value, height, zMin.Value);
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
        }

        /// <summary>
        /// Drawing a door
        /// </summary>
        /// <param name="H">Height of a door</param>
        /// <param name="zMin">Z-level of the base of door</param>
        void Door(double H, PromptDoubleResult zMin)
        {
            Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
            double height;
            PromptDoubleResult zMax;
            PromptDoubleResult heightResult;
            // Enter Z-max (and check if > Z-min) or Height 
            while (true)
            {
                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter Z-max level or ");
                zMaxO.DefaultValue = zMaxDoorOld;
                zMaxO.Keywords.Add("Height");
                zMax = ed.GetDouble(zMaxO);
                if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                {
                    PromptDoubleOptions heightO = new PromptDoubleOptions("\nEnter height:");
                    heightO.DefaultValue = heightDoorOld;
                    heightO.AllowNone = false;
                    heightO.AllowZero = false;
                    heightO.AllowNegative = false;
                    heightResult = ed.GetDouble(heightO);
                    if(heightResult.Status == PromptStatus.OK && heightResult.Value > 0)
                    {
                        height = heightResult.Value;
                        heightDoorOld = heightResult.Value;
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
                    zMaxDoorOld = zMax.Value;
                    height = zMax.Value - zMin.Value;
                    break;
                }
            }

            string currentLayer = Utils.Layers.CurrentLayer();
            while (true)
            {
                Utils.Layers.CreateLayerForCurrentFloor("!FDS_OBST[door]");
                Utils.Layers.SetLayerForCurrentFloor("!FDS_OBST[door]");
                PromptPointOptions p1O = new PromptPointOptions("\nPick door first corner or ");
                PromptPointResult p1 = ed.GetPoint(p1O);
                if (p1.Status == PromptStatus.Cancel)
                {
                    Utils.Layers.SetLayer(currentLayer);
                    break;
                }
                if (p1.Status != PromptStatus.OK) return;

                while (true)
                {
                    var p2 = ed.GetUcsCorner("\nPick door opposite corner: ", p1.Value);
                    if (p2.Status == PromptStatus.Cancel) break;
                    if (p2.Status != PromptStatus.OK) break;
                    if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                    {
                        Utils.Utils.CreateBox(p1.Value, p2.Value, height, zMin.Value);
                        Utils.Layers.SetLayer(currentLayer);
                        PromptKeywordOptions beamO = new PromptKeywordOptions("\nDraw beam?");
                        beamO.Keywords.Add("Yes");
                        beamO.Keywords.Add("No");
                        beamO.Keywords.Default = "Yes";
                        beamO.AllowNone = false;
                        PromptResult beamR = ed.GetKeywords(beamO);
                        if (beamR.StringResult == "Yes")
                        {
                            Utils.Utils.CreateBox(p1.Value, p2.Value, H - height, zMin.Value + height);
                        }
                        else if (beamR.Status != PromptStatus.OK) { break; }
                        break;
                    }
                    else
                    {
                        ed.WriteMessage("\nPick correct corner!");
                    }
                }
            }
            return;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="H"></param>
        /// <param name="zMin"></param>
        void Beam(double H, PromptDoubleResult zMin)
        {
            Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
            PromptDoubleOptions zMinBeamO = new PromptDoubleOptions("\nEnter beam Z-min level:");
            zMinBeamO.DefaultValue = zMinBeamOld;
            PromptDoubleResult zMinBeam = ed.GetDouble(zMinBeamO);
            if (zMinBeam.Status != PromptStatus.OK) return;
            zMinBeamOld = zMinBeam.Value;
            Utils.Utils.SetUCS(zMinBeam.Value);

            while (true)
            {
                PromptPointOptions p1O = new PromptPointOptions("\nPick beam first corner:");
                PromptPointResult p1 = ed.GetPoint(p1O);
                if (p1.Status == PromptStatus.Cancel) break;
                if (p1.Status != PromptStatus.OK) return;

                while (true)
                {
                    var p2 = ed.GetUcsCorner("\nPick beam opposite corner: ", p1.Value);
                    if (p2.Status == PromptStatus.Cancel) break;
                    if (p2.Status != PromptStatus.OK) return;
                    if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                    {
                        Utils.Utils.CreateBox(p1.Value, p2.Value, H - zMinBeam.Value, zMinBeam.Value);
                        break;
                    }
                    else
                    {
                        ed.WriteMessage("\nPick correct corner!");
                    }
                }
            }
            Utils.Utils.SetGlobalUCS(zMin.Value);
            return;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="H"></param>
        /// <param name="zMin"></param>
        void Window(double H, PromptDoubleResult zMin)
        {
            Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
            PromptDoubleOptions zMinWindowO = new PromptDoubleOptions("\nEnter window Z-min level:");
            zMinWindowO.DefaultValue = zMinWindowOld;
            PromptDoubleResult zMinWindow = ed.GetDouble(zMinWindowO);
            if (zMinWindow.Status != PromptStatus.OK || zMinWindow.Status != PromptStatus.Cancel) return;
            zMinWindowOld = zMinWindow.Value;

            double height;
            PromptDoubleResult zMax;
            PromptDoubleResult heightResult;
            // Enter Z-max (and check if > Z-min) or Height 
            while (true)
            {
                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter Z-max level or ");
                zMaxO.DefaultValue = zMaxWindowOld;
                zMaxO.Keywords.Add("Height");
                zMax = ed.GetDouble(zMaxO);
                if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                {
                    PromptDoubleOptions heightO = new PromptDoubleOptions("\nEnter height:");
                    heightO.DefaultValue = heightWindowOld;
                    heightO.AllowNone = false;
                    heightO.AllowZero = false;
                    heightO.AllowNegative = false;
                    heightResult = ed.GetDouble(heightO);
                    if(heightResult.Status == PromptStatus.OK)
                    {
                        height = heightResult.Value;
                        heightWindowOld = heightResult.Value;
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
                    zMaxWindowOld = zMax.Value;
                    height = zMax.Value - zMin.Value;
                    break;
                }
            }

            string currentLayer = Utils.Layers.CurrentLayer();
            Utils.Utils.SetUCS(zMinWindow.Value);
            while (true)
            {
                PromptPointOptions p1O = new PromptPointOptions("\nPick window first corner:");
                PromptPointResult p1 = ed.GetPoint(p1O);
                if (p1.Status == PromptStatus.Cancel) break;
                if (p1.Status != PromptStatus.OK) return;

                while (true)
                {
                    var p2 = ed.GetUcsCorner("\nPick window opposite corner: ", p1.Value);
                    if (p2.Status == PromptStatus.Cancel) break;
                    if (p2.Status != PromptStatus.OK) return;

                    if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                    {
                        Utils.Utils.CreateBox(p1.Value, p2.Value, zMinWindow.Value, zMin.Value);
                        Utils.Utils.CreateBox(p1.Value, p2.Value, H - (zMinWindow.Value + height), zMinWindow.Value + height);

                        PromptKeywordOptions holeO = new PromptKeywordOptions("\nLeave hole?");
                        holeO.Keywords.Add("Yes");
                        holeO.Keywords.Add("No");
                        holeO.Keywords.Default = "Yes";
                        holeO.AllowNone = false;
                        PromptResult holeR = ed.GetKeywords(holeO);
                        if (holeR.Status != PromptStatus.OK) return;
                        if (holeR.StringResult == "No")
                        {
                            Utils.Layers.CreateLayerForCurrentFloor("!FDS_OBST[glass]");
                            Utils.Layers.SetLayerForCurrentFloor("!FDS_OBST[glass]");
                            Utils.Utils.CreateBox(p1.Value, p2.Value, height, zMinWindow.Value);
                            Utils.Layers.SetLayer(currentLayer);
                        }
                        break;
                    }
                    else
                    {
                        ed.WriteMessage("\nPick correct corner!");
                    }
                }
            }
            Utils.Utils.SetGlobalUCS(zMin.Value);
            return;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="H"></param>
        /// <param name="zMin"></param>
        void Slant(double H, PromptDoubleResult zMin)
        {
            Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
            PromptPointOptions p1O = new PromptPointOptions("\nPick slant first point:");
            PromptPointResult p1 = ed.GetPoint(p1O);
            if (p1.Status != PromptStatus.OK) { return; }
            PromptPointOptions p2O = new PromptPointOptions("\nPick slant other point: ");
            p2O.UseBasePoint = true;
            p2O.BasePoint = p1.Value;
            p2O.UseDashedLine = true;
            PromptPointResult p2 = ed.GetPoint(p2O);
            if (p2.Status != PromptStatus.OK) { return; }

            Utils.Utils.Bresenham(p1.Value[0], p1.Value[1], p2.Value[0], p2.Value[1], H, zMin.Value);
            return;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="H"></param>
        /// <param name="zMin"></param>
        void Hole(PromptDoubleResult zMin)
        {
            Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
            PromptDoubleOptions zMinHoleO = new PromptDoubleOptions("\nEnter hole Z-min level:");
            zMinHoleO.DefaultValue = zMinHoleOld;
            PromptDoubleResult zMinHole = ed.GetDouble(zMinHoleO);
            if (zMinHole.Status != PromptStatus.OK) return;
            zMinHoleOld = zMinHole.Value;

            double height;
            PromptDoubleResult zMax;
            PromptDoubleResult heightResult;
            // Enter Z-max (and check if > Z-min) or Height 
            while (true)
            {
                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter Z-max level or ");
                zMaxO.DefaultValue = zMaxHoleOld;
                zMaxO.Keywords.Add("Height");
                zMax = ed.GetDouble(zMaxO);
                if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                {
                    PromptDoubleOptions heightO = new PromptDoubleOptions("\nEnter height:");
                    heightO.DefaultValue = heightHoleOld;
                    heightO.AllowNone = false;
                    heightO.AllowZero = false;
                    heightO.AllowNegative = false;
                    heightResult = ed.GetDouble(heightO);
                    if(heightResult.Status == PromptStatus.OK)
                    {
                        height = heightResult.Value;
                        heightHoleOld = heightResult.Value;
                        break;
                    }
                }
                else if (zMax.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                else if (zMax.Value <= zMinHole.Value)
                {
                    ed.WriteMessage("\nZ-max level should be greater than Z-min level");
                }
                else
                {
                    zMaxHoleOld = zMax.Value;
                    height = zMax.Value - zMinHole.Value;
                    break;
                }
            }

            string currentLayer = Utils.Layers.CurrentLayer();
            Utils.Layers.SetLayerForCurrentFloor("!FDS_HOLE");
            Utils.Utils.SetUCS(zMinHole.Value);
            while (true)
            {
                PromptPointOptions p1O = new PromptPointOptions("\nPick hole first corner:");
                PromptPointResult p1 = ed.GetPoint(p1O);
                if (p1.Status == PromptStatus.Cancel) break;
                if (p1.Status != PromptStatus.OK) return;

                while (true)
                {
                    var p2 = ed.GetUcsCorner("\nPick hole opposite corner: ", p1.Value);
                    if (p2.Status == PromptStatus.Cancel) break;
                    if (p2.Status != PromptStatus.OK) return;

                    if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                    {
                        Utils.Utils.CreateBox(p1.Value, p2.Value, height, zMinHole.Value);
                        Utils.Layers.SetLayer(currentLayer);
                        break;
                    }
                    else
                    {
                        ed.WriteMessage("\nPick correct corner!");
                    }
                }
            }
            Utils.Utils.SetGlobalUCS(zMin.Value);
            return;
        }

        [CommandMethod("fHOLE")]
        public void fHOLE(){
            Editor ed = Application.DocumentManager.MdiActiveDocument.Editor;
            Utils.Utils.Init();
            Utils.Layers.SetLayerForCurrentFloor("!FDS_HOLE");
            string currentLayer = Utils.Layers.CurrentLayer();
            Utils.Layers.SetLayerForCurrentFloor("!FDS_HOLE");

            PromptDoubleOptions zMinHoleO = new PromptDoubleOptions("\nEnter hole Z-min level:");
            zMinHoleO.DefaultValue = zMinHoleOld;
            PromptDoubleResult zMinHole = ed.GetDouble(zMinHoleO);
            if (zMinHole.Status != PromptStatus.OK) return;
            zMinHoleOld = zMinHole.Value;

            double height;
            PromptDoubleResult zMax;
            PromptDoubleResult heightResult;
            // Enter Z-max (and check if > Z-min) or Height 
            while (true)
            {
                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter Z-max level or ");
                zMaxO.DefaultValue = zMaxHoleOld;
                zMaxO.Keywords.Add("Height");
                zMax = ed.GetDouble(zMaxO);
                if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                {
                    PromptDoubleOptions heightO = new PromptDoubleOptions("\nEnter height:");
                    heightO.DefaultValue = heightHoleOld;
                    heightO.AllowNone = false;
                    heightO.AllowZero = false;
                    heightO.AllowNegative = false;
                    heightResult = ed.GetDouble(heightO);
                    if(heightResult.Status == PromptStatus.OK)
                    {
                        height = heightResult.Value;
                        heightHoleOld = heightResult.Value;
                        break;
                    }
                }
                else if (zMax.Status != PromptStatus.OK) { Utils.Utils.End(); return; }
                else if (zMax.Value <= zMinHole.Value)
                {
                    ed.WriteMessage("\nZ-max level should be greater than Z-min level");
                }
                else
                {
                    zMaxHoleOld = zMax.Value;
                    height = zMax.Value - zMinHole.Value;
                    break;
                }
            }

            Utils.Utils.SetUCS(zMinHole.Value);
            while (true)
            {
                PromptPointOptions p1O = new PromptPointOptions("\nPick hole first corner:");
                PromptPointResult p1 = ed.GetPoint(p1O);
                if (p1.Status == PromptStatus.Cancel) break;
                if (p1.Status != PromptStatus.OK) return;

                while (true)
                {
                    var p2 = ed.GetUcsCorner("\nPick hole opposite corner: ", p1.Value);
                    if (p2.Status == PromptStatus.Cancel) break;
                    if (p2.Status != PromptStatus.OK) return;

                    if (p1.Value.X != p2.Value.X && p1.Value.Y != p2.Value.Y)
                    {
                        Utils.Utils.CreateBox(p1.Value, p2.Value, height, zMinHole.Value);
                        Utils.Layers.SetLayer(currentLayer);
                        break;
                    }
                    else
                    {
                        ed.WriteMessage("\nPick correct corner!");
                    }
                }
            }
            Utils.Utils.End();
            return;
        }

    }
}
