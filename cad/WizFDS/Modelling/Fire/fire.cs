#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.EditorInput;
using Teigha.Geometry;
using Teigha.Runtime;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
#endif


namespace WizFDS.Modelling.Fire
{
    public class Fire
    {
        double zMinOld = 0.0;

        [CommandMethod("fFIRE")]
        public void fFIRE()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                Utils.Utils.Init();
                Utils.Utils.SetOrtho(false);
                // Change layer to fire
                if (!Utils.Layers.CurrentLayer().Contains("!FDS_FIRE"))
                    Utils.Layers.SetLayerType("!FDS_FIRE");

                while (true)
                {
                    PromptDoubleOptions zMinO = new PromptDoubleOptions("\nEnter fire Z-min level:");
                    zMinO.DefaultValue = zMinOld;
                    PromptDoubleResult zMin = ed.GetDouble(zMinO);
                    if (zMin.Status != PromptStatus.OK || zMin.Status == PromptStatus.Cancel) break;
                    zMinOld = zMin.Value;
                    Utils.Utils.SetUCS(zMin.Value);

                    while (true)
                    {
                        PromptPointOptions p1Option = new PromptPointOptions("\nSpecify fire first corner:");
                        p1Option.AllowNone = false;
                        PromptPointResult p1 = ed.GetPoint(p1Option);
                        if (p1.Status != PromptStatus.OK || p1.Status == PromptStatus.Cancel) break;

                        var p2 = ed.GetUcsCorner("Pick fire opposite corner:", p1.Value);
                        if (p2.Status != PromptStatus.OK || p2.Status == PromptStatus.Cancel) break;
                        Utils.Utils.CreateExtrudedSurface(new Point3d(p1.Value.X, p1.Value.Y, zMin.Value), new Point3d(p2.Value.X, p2.Value.Y, zMin.Value));
                    }
                }
                Utils.Utils.End();
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nProgram exception: " + e.ToString());

            }
        }
        
    }
}
