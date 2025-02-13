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
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
#elif GRX_APP
using acApp = Gssoft.Gscad.ApplicationServices.Application;
using Gssoft.Gscad.DatabaseServices;
using Gssoft.Gscad.EditorInput;
using Gssoft.Gscad.Runtime;
using Gssoft.Gscad.Geometry;
#endif

/*
 * Gotowe funkcje
 * fSLCF - rysowanie sliceow
 * fDEVC - rysowanie devc punktowych oraz plaszczyzn
 * 
 */

namespace WizFDS.Modelling.Output
{
    public class Output
    {
        double zDevcSurfaceOld = 1.8;
        double zSlcfOld = 1.8;

        double zMinOld = 0.0;
        double zMaxOld = 3.0;

        [CommandMethod("fSLCF")]
        public void fSLCF()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Utils.Utils.Init(true);
                if (!Utils.Layers.CurrentLayer().Contains("!FDS_SLCF"))
                    Utils.Layers.SetLayerType("!FDS_SLCF");

                while (true)
                {
                    PromptKeywordOptions orientationOptions = new PromptKeywordOptions("\nChoose orientation");
                    orientationOptions.Keywords.Add("Horizontal");
                    orientationOptions.Keywords.Add("Vertical");
                    orientationOptions.AllowNone = false;
                    PromptResult orientation = ed.GetKeywords(orientationOptions);
                    Extents3d ext = Utils.Utils.GetAllElementsBoundingBox();

                    if (orientation.Status != PromptStatus.OK || orientation.Status == PromptStatus.Cancel) { Utils.Utils.End(); return; };
                    if (orientation.Status == PromptStatus.OK)
                    {
                        if (orientation.StringResult == "Vertical")
                        {
                            while (true)
                            {
                                PromptPointOptions p1Option = new PromptPointOptions("\nSpecify first point:");
                                p1Option.AllowNone = false;
                                PromptPointResult p1 = ed.GetPoint(p1Option);
                                if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto End;
                                PromptPointOptions p2Option = new PromptPointOptions("\nSpecify second point:");
                                p2Option.AllowNone = false;
                                p2Option.UseBasePoint = true;
                                p2Option.BasePoint = p1.Value;
                                PromptPointResult p2 = ed.GetPoint(p2Option);
                                if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) goto End;
                                Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, ext.MinPoint.Z), new Point3d(p2.Value.X, p2.Value.Y, ext.MaxPoint.Z));
                            }
                        }
                        else if (orientation.StringResult == "Horizontal")
                        {
                            while (true)
                            {
                                PromptDoubleOptions zlevelOption = new PromptDoubleOptions("Enter Z level (min: " + ext.MinPoint.Z + ", max: " + ext.MaxPoint.Z + ")");
                                zlevelOption.AllowNone = false;
                                zlevelOption.DefaultValue = zSlcfOld;
                                PromptDoubleResult zlevel = ed.GetDouble(zlevelOption);
                                if (zlevel.Status != PromptStatus.OK || zlevel.Status == PromptStatus.Cancel) goto End;
                                if (zlevel.Status == PromptStatus.OK)
                                    zSlcfOld = zlevel.Value;
                                Utils.Utils.CreateExtrudedSurface(new Point3d(ext.MinPoint.X - (Utils.Utils.snapUnit[0] * 4), ext.MinPoint.Y - (Utils.Utils.snapUnit[1] * 4), zlevel.Value), new Point3d(ext.MaxPoint.X + (Utils.Utils.snapUnit[0] * 4), ext.MaxPoint.Y + (Utils.Utils.snapUnit[1] * 4), zlevel.Value));
                            }
                        }
                    }
                End:;
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
            }
        }

        [CommandMethod("fDEVC")]
        public void fDEVC()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Utils.Utils.Init(true);
                // Change layer to devc
                if(!Utils.Layers.CurrentLayer().Contains("!FDS_DEVC"))
                    Utils.Layers.SetLayerType("!FDS_DEVC");

                while (true)
                {
                    PromptKeywordOptions typeOptions = new PromptKeywordOptions("\nChoose device type");
                    typeOptions.Keywords.Add("Point");
                    typeOptions.Keywords.Add("Surface");
                    typeOptions.Keywords.Add("Volume");
                    typeOptions.AllowNone = false;
                    PromptResult type = ed.GetKeywords(typeOptions);

                    if (type.Status != PromptStatus.OK || type.Status == PromptStatus.Cancel) { Utils.Utils.End(); return; } ;
                    if (type.Status == PromptStatus.OK)
                    {
                        if (type.StringResult == "Point")
                        {
                            Extents3d ext = Utils.Utils.GetAllElementsBoundingBox();
                            while (true)
                            {
                                PromptDoubleOptions zlevelOption = new PromptDoubleOptions("Enter Z level (min: " + ext.MinPoint.Z + ", max: " + ext.MaxPoint.Z + ")");
                                zlevelOption.AllowNone = false;
                                zlevelOption.DefaultValue = zDevcSurfaceOld;
                                PromptDoubleResult zlevel = ed.GetDouble(zlevelOption);
                                if (zlevel.Status != PromptStatus.OK || zlevel.Status == PromptStatus.Cancel) goto EndPoint;
                                if (zlevel.Status == PromptStatus.OK)
                                {
                                    zDevcSurfaceOld = zlevel.Value;
                                    while (true)
                                    {
                                        PromptPointOptions p1Option = new PromptPointOptions("\nPick device point:");
                                        p1Option.AllowNone = false;
                                        PromptPointResult p1 = ed.GetPoint(p1Option);
                                        if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto EndPoint;
                                        Utils.Utils.CreateSphere(new Point3d(p1.Value.X, p1.Value.Y, zlevel.Value), 0.1);
                                    }
                                }
                            }
                        EndPoint:;
                        }
                        else if (type.StringResult == "Surface")
                        {
                            while (true)
                            {
                                PromptKeywordOptions orientationOptions = new PromptKeywordOptions("\nChoose orientation");
                                orientationOptions.Keywords.Add("Horizontal");
                                orientationOptions.Keywords.Add("Vertical");
                                orientationOptions.AllowNone = false;
                                PromptResult orientation = ed.GetKeywords(orientationOptions);
                                //Extents3d ext = Utils.Utils.GetAllElementsBoundingBox();

                                if (orientation.Status != PromptStatus.OK || orientation.Status == PromptStatus.Cancel) goto EndSurface;
                                if (orientation.Status == PromptStatus.OK)
                                {
                                    if (orientation.StringResult == "Vertical")
                                    {
                                        while (true)
                                        {
                                            PromptDoubleOptions zlevelMinOption = new PromptDoubleOptions("Enter device Z-min level");
                                            zlevelMinOption.AllowNone = false;
                                            PromptDoubleResult zlevelMin = ed.GetDouble(zlevelMinOption);
                                            if (zlevelMin.Status != PromptStatus.OK || zlevelMin.Status == PromptStatus.Cancel) goto EndSurface;

                                            PromptDoubleOptions zlevelMaxOption = new PromptDoubleOptions("Enter device Z-max level");
                                            zlevelMaxOption.AllowNone = false;
                                            PromptDoubleResult zlevelMax = ed.GetDouble(zlevelMaxOption);
                                            if (zlevelMax.Status != PromptStatus.OK || zlevelMax.Status == PromptStatus.Cancel) goto EndSurface;

                                            Utils.Utils.SetOrtho(true);

                                            while (true)
                                            {
                                                PromptPointOptions p1Option = new PromptPointOptions("\nSpecify first point:");
                                                p1Option.AllowNone = false;
                                                PromptPointResult p1 = ed.GetPoint(p1Option);
                                                if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto EndSurface;

                                                PromptPointOptions p2Option = new PromptPointOptions("\nSpecify second point:");
                                                p2Option.AllowNone = false;
                                                p2Option.UseBasePoint = true;
                                                p2Option.BasePoint = p1.Value;
                                                PromptPointResult p2 = ed.GetPoint(p2Option);
                                                if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) goto EndSurface;
                                                Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zlevelMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zlevelMax.Value));
                                            }

                                        }
                                    }
                                    else if (orientation.StringResult == "Horizontal")
                                    {
                                        while (true)
                                        {
                                            PromptDoubleOptions zlevelOption = new PromptDoubleOptions("Enter Z level");
                                            zlevelOption.AllowNone = false;
                                            zlevelOption.DefaultValue = 1.8;
                                            PromptDoubleResult zlevel = ed.GetDouble(zlevelOption);
                                            if (zlevel.Status != PromptStatus.OK || zlevel.Status == PromptStatus.Cancel) goto EndSurface;

                                            Utils.Utils.SetOrtho(false);

                                            while (true)
                                            {
                                                PromptPointOptions p1Option = new PromptPointOptions("\nSpecify first point:");
                                                p1Option.AllowNone = false;
                                                PromptPointResult p1 = ed.GetPoint(p1Option);
                                                if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) goto EndSurface;

                                                var p2 = ed.GetUcsCorner("Pick opposite corner:", p1.Value);
                                                if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) goto EndSurface;
                                                Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zlevel.Value), new Point3d(p2.Value.X, p2.Value.Y, zlevel.Value));

                                            }
                                        }
                                    }

                                }
                            }
                            EndSurface:;
                        }
                        else if(type.StringResult == "Volume")
                        {
                            // Box height
                            double H = 0;

                            // Get Z-min level
                            PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter devc Z-min level:");
                            zMinO.DefaultValue = zMinOld;
                            PromptDoubleResult zMin = ed.GetDouble(zMinO);
                            if (zMin.Status != PromptStatus.OK) goto EndVolume;
                            zMinOld = zMin.Value;
                            Utils.Utils.SetUCS(zMin.Value);

                            // Check if Z-max is less then Z-min
                            while (true)
                            {
                                PromptDoubleOptions zMaxO = new PromptDoubleOptions("\nEnter devc Z-max level:");
                                zMaxO.DefaultValue = zMaxOld;
                                PromptDoubleResult zMax = ed.GetDouble(zMaxO);
                                zMaxOld = zMax.Value;
                                if (zMax.Status != PromptStatus.OK) goto EndVolume;
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

                            PromptPointOptions p1O = new PromptPointOptions("\nSpecify devc first point ");
                            PromptPointResult p1;
                            while (true)
                            {
                                Utils.Utils.SetOrtho(true);
                                p1 = ed.GetPoint(p1O);
                                if (p1.Status == PromptStatus.Cancel) break;
                                if (p1.Status != PromptStatus.OK) break;
                                else
                                {
                                    while (true)
                                    {
                                        var p2 = ed.GetUcsCorner("\nPick devc opposite corner: ", p1.Value);
                                        if (p2.Status != PromptStatus.OK) goto EndVolume;
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
                        }
                        EndVolume:;
                    }
                    Utils.Utils.End();
                }
             
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());
            }
        }

    }
}
 
