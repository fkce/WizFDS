#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Teigha.DatabaseServices;
using Bricscad.EditorInput;
using Teigha.Geometry;
using Teigha.Runtime;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.EditorInput;
#elif GRX_APP
using acApp = Gssoft.Gscad.ApplicationServices.Application;
using Gssoft.Gscad.EditorInput;
#endif

using System;
using WizFDS.Export;

namespace WizFDS.Websocket
{
    public class acWebSocketRouter
    {

        Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;

        public acWebSocketRouter()
        {

        }

        public acWebSocketMessage callMethod(acWebSocketMessage message) {

            String method = message.getMethod();
            String status="";
            dynamic data = new System.Dynamic.ExpandoObject();
            isCreatedObject isCreated = new isCreatedObject();

            //string jsonF = JsonConvert.SerializeObject(message.getData(), Formatting.Indented);
            //ed.WriteMessage(jsonF);


            if (method != "" && method != null)
            {
                switch (method)
                {
                    // Implemented functions in Web app
                    case "syncAllWeb":
                        ImportFds.SyncAllWeb(message.getData());
                        break;

                    case "createLibraryLayersWeb":
                        if (ImportFds.CreateLibraryLayersWeb(message.getData())) status = "success";
                        else status = "error";
                        break;

                    case "getCadGeometryWeb":
                        acWebSocketMessage answer = ImportFds.GetCadElementsWeb(message.getData());
                        if (answer.getStatus() == "success")
                        {
                            status = answer.getStatus();
                            data = answer.getData();
                        }
                        else status = "error";
                        break;

                    case "selectObjectWeb":
                        if (ImportFds.SelectObjectWeb(message.getData())) status = "success";
                        else status = "error";
                        break;

                    // Creating layers from web app
                    case "createObstSurfWeb":
                        isCreated = ImportFds.CreateObstSurfWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        break;

                    case "createVentSurfWeb":
                        isCreated = ImportFds.CreateVentSurfWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        status = "success";
                        break;

                    case "createJetfanSurfWeb":
                        isCreated = ImportFds.CreateJetfanSurfWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        status = "success";
                        break;

                    case "createSpecSurfWeb":
                        isCreated = ImportFds.CreateSpecSurfWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        status = "success";
                        break;

                    case "createFireSurfWeb":
                        isCreated = ImportFds.CreateFireSurfWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        status = "success";
                        break;

                    case "createSlcfSurfWeb":
                        isCreated = ImportFds.CreateSlcfSurfWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        status = "success";
                        break;

                    case "createDevcSurfWeb":
                        isCreated = ImportFds.CreateDevcSurfWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        status = "success";
                        break;

                    // Other functions which are implemented but not used

                    // GENERAL FUNTIONS
                    case "syncPartWeb": // Not ready
                        break;
                    case "syncLayersWeb":  
                        ImportFds.SyncLayersWeb(message.getData());
                        break;

                    // MESH & OPEN
                    case "createMeshWeb":
                        isCreated = ImportFds.CreateMeshWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        break;
                    case "updateMeshWeb":
                        if (ImportFds.UpdateMeshWeb(message.getData())) status = "success";
                        else status = "error";
                        break;
                    case "deleteMeshWeb":
                        if (ImportFds.DeleteMeshWeb(message.getData())) status = "success";
                        else status = "error";
                        break;

                    // TODO OPEN!!!

                    // SURFACE
                    case "updateObstSurfWeb":
                        if (ImportFds.UpdateObstSurfWeb(message.getData())) status = "success";
                        else status = "error";
                        break;
                    case "deleteObstSurfWeb":
                        if (ImportFds.DeleteObstSurfWeb(message.getData())) status = "success";
                        else status = "error";
                        break;

                    // OBSTRUCTION & HOLE
                    case "createObstWeb": // OK
                        isCreated = ImportFds.CreateObstWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        break;
                    case "updateObstWeb": // OK
                        isCreated = ImportFds.UpdateObstWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        break;
                    case "deleteObstWeb":
                        if (ImportFds.DeleteObstWeb(message.getData())) status = "success";
                        else status = "error";
                        break;

                    case "createHoleWeb": // OK
                        isCreated = ImportFds.CreateHoleWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        break;
                    case "updateHoleWeb": // OK
                        if (ImportFds.UpdateHoleWeb(message.getData())) status = "success";
                        else status = "error";
                        break;
                    case "deleteHoleWeb":
                        if (ImportFds.DeleteHoleWeb(message.getData())) status = "success";
                        else status = "error";
                        break;

                    // TODO: Changing obst surface ??

                    // VENTILATION & JETFAN
                    case "deleteVentSurfWeb": // OK
                        if (ImportFds.DeleteVentSurfWeb(message.getData())) status = "success";
                        else status = "error";
                        status = "success";
                        break;
                    case "updateVentSurfWeb": // OK
                        //if (webToAc.UpdateSurfWeb(message.getData())) status = "success";
                        //else status = "error";
                        status = "success";
                        break;
                    case "createVentWeb":
                        isCreated = ImportFds.CreateVentWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        break;
                    case "updateVentWeb":
                        if (ImportFds.UpdateVentWeb(message.getData())) status = "success";
                        else status = "error";
                        break;
                    case "deleteVentWeb":
                        if (ImportFds.DeleteVentWeb(message.getData())) status = "success";
                        else status = "error";
                        break;

                    // OUTPUT
                    case "createDevcWeb":
                        isCreated = ImportFds.CreateDevcWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        break;
                    case "updateDevcWeb":
                        if (ImportFds.UpdateDevcWeb(message.getData())) status = "success";
                        else status = "error";
                        break;
                    case "deleteDevcWeb":
                        if (ImportFds.DeleteDevcWeb(message.getData())) status = "success";
                        else status = "error";
                        break;

                    case "createSlcfWeb":
                        isCreated = ImportFds.CreateSlcfWeb(message.getData());
                        if (isCreated.isCreated)
                        {
                            status = "success";
                            data = isCreated.acObj;
                        }
                        else status = "error";
                        break;
                    case "updateSlcfWeb":
                        if (ImportFds.UpdateSlcfWeb(message.getData())) status = "success";
                        else status = "error";
                        break;
                    case "deleteSlcfWeb":
                        if (ImportFds.DeleteSlcfWeb(message.getData())) status = "success";
                        else status = "error";
                        break;


                    default:
                        status = "error - method not found";
                        break;
                }
            }

            acWebSocketMessage result = new acWebSocketMessage(status, message.getMethod(), data, message.getId());
            return result;
        }
        
        /*
        public void getMessage(acWebSocketMessage message)
        {
            
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            for (int i = 0; i < 10; i++)
            {
                ed.WriteMessage(message.getMethod());
                Thread.Sleep(1000);
            }

            //String method = message.getMethod();

        }
         */
          
    }
}
