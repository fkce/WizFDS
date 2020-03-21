#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Teigha.DatabaseServices;
using Bricscad.EditorInput;
using Teigha.Geometry;
using Teigha.Runtime;
using BricscadDb;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
using Autodesk.AutoCAD.Interop.Common;
#endif

using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using WizFDS.Websocket;
using WizFDS.Utils;


namespace WizFDS.Evac
{

    public class Export
    {

        class Room
        {
            int idx;
            dynamic[] points;
            double[] z;
            bool room_enter;
            string evacuees_density;
        }

        private class EvacObject
        {

        }

        [CommandMethod("fEvac", CommandFlags.Session)]
        public void fEvac()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            try
            {
                // foreach layer ...
                Object room = new Room();


            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nWizFDS exception:" + e.ToString());
            }
        }


    }
}
