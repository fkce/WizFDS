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

namespace WizFDS.Modelling.Specie
{
    public class Spec
    {
        double zMinOld = 2.0;
        double zMaxOld = 2.2;
        double heightOld = 0.2;

        [CommandMethod("fSPEC")]
        public void fSPEC()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Utils.Utils.Init();
                if (!Utils.Layers.CurrentLayer().Contains("!FDS_SPEC"))
                    Utils.Layers.SetLayerType("!FDS_SPEC");

                while (true)
                {
                    PromptKeywordOptions orientationOptions = new PromptKeywordOptions("\nChoose vent orientation");
                    orientationOptions.Keywords.Add("Horizontal");
                    orientationOptions.Keywords.Add("Vertical");
                    orientationOptions.AllowNone = false;
                    PromptResult orientation = ed.GetKeywords(orientationOptions);

                    if (orientation.Status != PromptStatus.OK || orientation.Status == PromptStatus.Cancel) { Utils.Utils.End(); break; }
                    if (orientation.Status == PromptStatus.OK)
                    {
                        if (orientation.StringResult == "Vertical")
                        {
                            while (true)
                            {

                                PromptDoubleOptions zMinOption = new PromptDoubleOptions("Enter vent Z-min level");
                                zMinOption.AllowNone = false;
                                zMinOption.DefaultValue = zMinOld;
                                PromptDoubleResult zMin = ed.GetDouble(zMinOption);
                                if (zMin.Status != PromptStatus.OK || zMin.Status == PromptStatus.Cancel) goto End;
                                zMinOld = zMin.Value;
                                Utils.Utils.SetUCS(zMin.Value);

                                double height;
                                PromptDoubleResult zMax;
                                PromptDoubleResult heightResult;
                                // Enter Z-max (and check if > Z-min) or Height 
                                while (true)
                                {
                                    PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter vent Z-max level or ");
                                    zMaxO.DefaultValue = zMaxOld;
                                    zMaxO.Keywords.Add("Height");
                                    zMax = ed.GetDouble(zMaxO);
                                    if (zMax.Status == PromptStatus.Keyword && zMax.StringResult == "Height")
                                    {
                                        PromptDoubleOptions heightO = new PromptDoubleOptions("\nEnter vent height:");
                                        heightO.DefaultValue = heightOld;
                                        heightO.AllowNone = false;
                                        heightO.AllowZero = false;
                                        heightO.AllowNegative = false;
                                        heightResult = ed.GetDouble(heightO);
                                        if (heightResult.Status == PromptStatus.OK)
                                        {
                                            height = heightResult.Value;
                                            heightOld = heightResult.Value;
                                            break;
                                        }
                                    }
                                    else if (zMax.Status != PromptStatus.OK) goto End;
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

                                Utils.Utils.SetOrtho(true);

                                while (true)
                                {
                                    PromptPointOptions p1Option = new PromptPointOptions("\nSpecify vent first corner:");
                                    p1Option.AllowNone = false;
                                    PromptPointResult p1 = ed.GetPoint(p1Option);
                                    if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto End;

                                    PromptPointOptions p2Option = new PromptPointOptions("\nSpecify vent second corner:");
                                    p2Option.AllowNone = false;
                                    p2Option.UseBasePoint = true;
                                    p2Option.BasePoint = p1.Value;
                                    PromptPointResult p2 = ed.GetPoint(p2Option);
                                    if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) goto End;
                                    Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMax.Value));
                                }
                            }
                        }
                        else if (orientation.StringResult == "Horizontal")
                        {
                            while (true)
                            {
                                PromptDoubleOptions zlevelOption = new PromptDoubleOptions("Enter vent Z level");
                                zlevelOption.AllowNone = false;
                                zlevelOption.DefaultValue = zMinOld;
                                PromptDoubleResult zlevel = ed.GetDouble(zlevelOption);
                                if (zlevel.Status != PromptStatus.OK || zlevel.Status == PromptStatus.Cancel) goto End;
                                zMinOld = zlevel.Value;
                                Utils.Utils.SetUCS(zlevel.Value);

                                Utils.Utils.SetOrtho(false);

                                while (true)
                                {
                                    PromptPointOptions p1Option = new PromptPointOptions("\nSpecify vent first corner:");
                                    p1Option.AllowNone = false;
                                    PromptPointResult p1 = ed.GetPoint(p1Option);
                                    if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto End;

                                    var p2 = ed.GetUcsCorner("Pick vent opposite corner:", p1.Value);
                                    if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) goto End;
                                    Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zlevel.Value), new Point3d(p2.Value.X, p2.Value.Y, zlevel.Value));
                                }
                            }
                        }

                    }
                    End:;
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
