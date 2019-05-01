#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Bricscad.Windows;
using Bricscad.EditorInput;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.Windows;
#endif

using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Windows.Media.Imaging;
using System.Windows.Controls;

namespace WizFDS.Ribbon
{
    // http://through-the-interface.typepad.com/through_the_interface/2016/02/disabling-the-autocad-ribbon-using-net.html
    // włacznie wylaczanie ribbona

    public class Ribbon
    {
        public static RibbonButton sWebsocketBtn = new RibbonButton();
        public static RibbonButton lHideFdsBtn = new RibbonButton();
        public static RibbonButton lHideOtherBtn = new RibbonButton();

        static RibbonPanel cfastPanel = new RibbonPanel();
        static RibbonPanel syncPanel = new RibbonPanel();

        public Ribbon()
        {
            if (RibbonInit.isRibbonInited == false)
#if ARX_APP
                InitArxRibbon();
#elif BRX_APP
                InitBrxRibbon();
#endif
        }

        public static void WebSocketOpened()
        {
#if ARX_APP
            sWebsocketBtn.LargeImage = Images.getBitmap(Properties.Resources.websocOpenLarge);
#elif BRX_APP
            sWebsocketBtn.LargeImage = Images.getBitmapPath(Properties.Resources.websocOpenLarge, "websocOpenLarge");
#endif
            sWebsocketBtn.Text = "WebSocket\nopened";
            syncPanel.IsEnabled = true;
        }
        public static void WebSockedClosed()
        {
#if ARX_APP
            sWebsocketBtn.LargeImage = Images.getBitmap(Properties.Resources.websocCloseLarge);
#elif BRX_APP
            sWebsocketBtn.LargeImage = Images.getBitmapPath(Properties.Resources.websocCloseLarge, "websocCloseLarge");
#endif
            sWebsocketBtn.Text = "WebSocket\nclosed";
            syncPanel.IsEnabled = false;
        }

#if ARX_APP
        // AutoCAD Ribbon
        public static void InitArxRibbon()
        {
            try
            {
                RibbonControl ribbonControl = ComponentManager.Ribbon;
                RibbonTab Tab = new RibbonTab();
                Tab.Title = "WizFDS";
                Tab.Id = "wizfds_id2586";
                ribbonControl.Tabs.Add(Tab);
                // Cfast Panel
                RibbonPanelSource cfastPanelSource = new RibbonPanelSource();
                cfastPanelSource.Title = "CFAST model";
                cfastPanel.Source = cfastPanelSource;
                Tab.Panels.Add(cfastPanel);

#if AAMKS
        #region Cfast panel
                // Cfast buttons
                RibbonButton cRoomBtn = new RibbonButton();
                cRoomBtn.Text = "Room";
                cRoomBtn.Name = "Room";
                cRoomBtn.ShowText = true;
                cRoomBtn.ShowImage = true;
                cRoomBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cRoomBtn.LargeImage = Images.getBitmap(Properties.Resources.obstLarge);
                cRoomBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cRoomBtn.Size = RibbonItemSize.Large;
                cRoomBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton cCorridorBtn = new RibbonButton();
                cCorridorBtn.Text = "Corridor";
                cCorridorBtn.Name = "Corridor";
                cCorridorBtn.ShowText = true;
                cCorridorBtn.ShowImage = true;
                cCorridorBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cCorridorBtn.LargeImage = Images.getBitmap(Properties.Resources.corridorLarge);
                cCorridorBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cCorridorBtn.Size = RibbonItemSize.Large;
                cCorridorBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton cHallBtn = new RibbonButton();
                cHallBtn.Text = "Hall";
                cHallBtn.Name = "Hall";
                cHallBtn.ShowText = true;
                cHallBtn.ShowImage = true;
                cHallBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cHallBtn.LargeImage = Images.getBitmap(Properties.Resources.obstLarge);
                cHallBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cHallBtn.Size = RibbonItemSize.Large;
                cHallBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton cStairBtn = new RibbonButton();
                cStairBtn.Text = "Staircase";
                cStairBtn.Name = "Staircase";
                cStairBtn.ShowText = true;
                cStairBtn.ShowImage = true;
                cStairBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cStairBtn.LargeImage = Images.getBitmap(Properties.Resources.staircaseLarge);
                cStairBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cStairBtn.Size = RibbonItemSize.Large;
                cStairBtn.CommandHandler = new RibbonCommandHandler();

                // Add to main panel
                cfastPanelSource.Items.Add(cRoomBtn);
                cfastPanelSource.Items.Add(cCorridorBtn);
                cfastPanelSource.Items.Add(cHallBtn);
                cfastPanelSource.Items.Add(cStairBtn);
                cfastPanelSource.Items.Add(new RibbonSeparator());

                RibbonButton cDoorBtn = new RibbonButton();
                cDoorBtn.Text = "Door";
                cDoorBtn.Name = "Door";
                cDoorBtn.ShowText = true;
                cDoorBtn.ShowImage = true;
                cDoorBtn.Image = Images.getBitmap(Properties.Resources.door);
                cDoorBtn.LargeImage = Images.getBitmap(Properties.Resources.doorLarge);
                cDoorBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cDoorBtn.Size = RibbonItemSize.Large;
                cDoorBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton cWindowBtn = new RibbonButton();
                cWindowBtn.Text = "Window";
                cWindowBtn.Name = "Window";
                cWindowBtn.ShowText = true;
                cWindowBtn.ShowImage = true;
                cWindowBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cWindowBtn.LargeImage = Images.getBitmap(Properties.Resources.windowLarge);
                cWindowBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cWindowBtn.Size = RibbonItemSize.Large;
                cWindowBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton cInletBtn = new RibbonButton();
                cInletBtn.Text = "Inlet";
                cInletBtn.Name = "Inlet";
                cInletBtn.ShowText = true;
                cInletBtn.ShowImage = true;
                cInletBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cInletBtn.LargeImage = Images.getBitmap(Properties.Resources.inletLarge);
                cInletBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cInletBtn.Size = RibbonItemSize.Large;
                cInletBtn.CommandHandler = new RibbonCommandHandler();

                cfastPanelSource.Items.Add(cDoorBtn);
                cfastPanelSource.Items.Add(cWindowBtn);
                cfastPanelSource.Items.Add(cInletBtn);

                RibbonButton cVventBtn = new RibbonButton();
                cVventBtn.Text = "Vvent";
                cVventBtn.Name = "Vvent";
                cVventBtn.ShowText = true;
                cVventBtn.ShowImage = true;
                cVventBtn.Image = Images.getBitmap(Properties.Resources.vent);
                cVventBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                cVventBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton cHoleBtn = new RibbonButton();
                cHoleBtn.Text = "Auto Hole";
                cHoleBtn.Name = "Holeaut";
                cHoleBtn.ShowText = true;
                cHoleBtn.ShowImage = true;
                cHoleBtn.Image = Images.getBitmap(Properties.Resources.holeaut);
                cHoleBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                //cHoleBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                //cHoleBtn.Size = RibbonItemSize.Large;
                cHoleBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton cHolemanBtn = new RibbonButton();
                cHolemanBtn.Text = "Hole";
                cHolemanBtn.Name = "Holeman";
                cHolemanBtn.ShowText = true;
                cHolemanBtn.ShowImage = true;
                cHolemanBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cHolemanBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                cHolemanBtn.CommandHandler = new RibbonCommandHandler();

                // Create row panel 
                RibbonRowPanel cVentRow = new RibbonRowPanel();
                cVentRow.Items.Add(cVventBtn);
                cVentRow.Items.Add(new RibbonRowBreak());
                cVentRow.Items.Add(cHoleBtn);
                cVentRow.Items.Add(new RibbonRowBreak());
                cVentRow.Items.Add(cHolemanBtn);

                cfastPanelSource.Items.Add(cVentRow);
        #endregion
#endif

#if WIZFDS

        #region FDS Geometry Panel
                // FDS Geometry Panel
                Autodesk.Windows.RibbonPanelSource fdsGeometryPanelSource = new RibbonPanelSource();
                fdsGeometryPanelSource.Title = "FDS Geometry";
                RibbonPanel fdsGeometryPanel = new RibbonPanel();
                fdsGeometryPanel.Source = fdsGeometryPanelSource;
                Tab.Panels.Add(fdsGeometryPanel);

                // FDS buttons
                RibbonButton fMeshBtn = new RibbonButton();
                fMeshBtn.Name = "Mesh";
                fMeshBtn.Text = "Mesh";
                fMeshBtn.ShowText = true;
                fMeshBtn.ShowImage = true;
                fMeshBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fMeshBtn.LargeImage = Images.getBitmap(Properties.Resources.meshLarge);
                fMeshBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fMeshBtn.Size = RibbonItemSize.Large;
                fMeshBtn.CommandHandler = new RibbonCommandHandler();
                RibbonToolTip fMeshTT = new RibbonToolTip();
                fMeshTT.Command = "FMESH";
                fMeshTT.Title = "Create MESH manually";
                fMeshTT.Content = "Create MESH using two points in drawing";
                fMeshTT.ExpandedContent = "Define Z min level, Z max level and than two points in drawing. Layer is changed automatically to !FDS_MESH.";
                fMeshBtn.ToolTip = fMeshTT;

                RibbonButton fMeshAutoBtn = new RibbonButton();
                fMeshAutoBtn.Name = "MeshAuto";
                fMeshAutoBtn.Text = "Mesh\nauto";
                fMeshAutoBtn.ShowText = true;
                fMeshAutoBtn.ShowImage = true;
                fMeshAutoBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fMeshAutoBtn.LargeImage = Images.getBitmap(Properties.Resources.meshLarge);
                fMeshAutoBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fMeshAutoBtn.Size = RibbonItemSize.Large;
                fMeshAutoBtn.CommandHandler = new RibbonCommandHandler();
                RibbonToolTip fMeshAutoTT = new RibbonToolTip();
                fMeshAutoTT.Command = "FMESHAUTO";
                fMeshAutoTT.Title = "Create MESH automatically";
                fMeshAutoTT.Content = "Create multiple MESHes using two points in drawing";
                fMeshAutoTT.ExpandedContent = "Define horizontal and vertical mesh numbers. Z level is automatically fitted to FDS geometry. Layer is changed automatically to !FDS_MESH.";
                fMeshAutoBtn.ToolTip = fMeshAutoTT;

                RibbonButton fOpenBtn = new RibbonButton();
                fOpenBtn.Name = "Open";
                fOpenBtn.Text = "Open";
                fOpenBtn.ShowText = true;
                fOpenBtn.ShowImage = true;
                fOpenBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fOpenBtn.LargeImage = Images.getBitmap(Properties.Resources.openLarge);
                //fOpenBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fOpenBtn.Size = RibbonItemSize.Standard;
                fOpenBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fOpenVisualBtn = new RibbonButton();
                fOpenVisualBtn.Name = "OpenVisual";
                fOpenVisualBtn.Text = "Visual open";
                fOpenVisualBtn.ShowText = true;
                fOpenVisualBtn.ShowImage = true;
                fOpenVisualBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fOpenVisualBtn.LargeImage = Images.getBitmap(Properties.Resources.openLarge);
                //fOpenVisualBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fOpenVisualBtn.Size = RibbonItemSize.Standard;
                fOpenVisualBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fOpenManualBtn = new RibbonButton();
                fOpenManualBtn.Name = "OpenManual";
                fOpenManualBtn.Text = "Manual open";
                fOpenManualBtn.ShowText = true;
                fOpenManualBtn.ShowImage = true;
                fOpenManualBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fOpenManualBtn.LargeImage = Images.getBitmap(Properties.Resources.openLarge);
                //fOpenManualBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fOpenManualBtn.Size = RibbonItemSize.Standard;
                fOpenManualBtn.CommandHandler = new RibbonCommandHandler();

                // Add to main panel
                RibbonRowPanel fOpenRow = new RibbonRowPanel();
                fOpenRow.Items.Add(fOpenBtn);
                fOpenRow.Items.Add(new RibbonRowBreak());
                fOpenRow.Items.Add(fOpenVisualBtn);
                fOpenRow.Items.Add(new RibbonRowBreak());
                fOpenRow.Items.Add(fOpenManualBtn);

                fdsGeometryPanelSource.Items.Add(fMeshBtn);
                fdsGeometryPanelSource.Items.Add(fMeshAutoBtn);
                fdsGeometryPanelSource.Items.Add(fOpenRow);
                fdsGeometryPanelSource.Items.Add(new RibbonSeparator());

                RibbonButton fObstBtn = new RibbonButton();
                fObstBtn.Name = "Obst";
                fObstBtn.Text = "Obst";
                fObstBtn.ShowText = true;
                fObstBtn.ShowImage = true;
                fObstBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fObstBtn.LargeImage = Images.getBitmap(Properties.Resources.obstLarge);
                fObstBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fObstBtn.Size = RibbonItemSize.Large;
                fObstBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fHoleBtn = new RibbonButton();
                fHoleBtn.Name = "Hole";
                fHoleBtn.Text = "Hole";
                fHoleBtn.ShowText = true;
                fHoleBtn.ShowImage = true;
                fHoleBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fHoleBtn.LargeImage = Images.getBitmap(Properties.Resources.obstLarge);
                fHoleBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fHoleBtn.Size = RibbonItemSize.Large;
                fHoleBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fWallBtn = new RibbonButton();
                fWallBtn.Name = "Wall";
                fWallBtn.Text = "Wall";
                fWallBtn.ShowText = true;
                fWallBtn.ShowImage = true;
                fWallBtn.Image = Images.getBitmap(Properties.Resources.wall);
                fWallBtn.LargeImage = Images.getBitmap(Properties.Resources.wallLarge);
                fWallBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fCeilingBtn = new RibbonButton();
                fCeilingBtn.Name = "Ceiling";
                fCeilingBtn.Text = "Ceiling";
                fCeilingBtn.ShowText = true;
                fCeilingBtn.ShowImage = true;
                fCeilingBtn.Image = Images.getBitmap(Properties.Resources.ceiling);
                fCeilingBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                fCeilingBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fCWallBtn = new RibbonButton();
                fCWallBtn.Name = "CWall";
                fCWallBtn.Text = "CWall";
                fCWallBtn.ShowText = true;
                fCWallBtn.ShowImage = true;
                fCWallBtn.Image = Images.getBitmap(Properties.Resources.cwall);
                fCWallBtn.LargeImage = Images.getBitmap(Properties.Resources.wallLarge);
                fCWallBtn.CommandHandler = new RibbonCommandHandler();

                // Create row panel 
                RibbonRowPanel fGeometryRow = new RibbonRowPanel();
                fGeometryRow.Items.Add(fWallBtn);
                fGeometryRow.Items.Add(new RibbonRowBreak());
                fGeometryRow.Items.Add(fCeilingBtn);
                fGeometryRow.Items.Add(new RibbonRowBreak());
                fGeometryRow.Items.Add(fCWallBtn);

                fdsGeometryPanelSource.Items.Add(fObstBtn);
                fdsGeometryPanelSource.Items.Add(fHoleBtn);
                fdsGeometryPanelSource.Items.Add(fGeometryRow);

                RibbonButton fGeomBtn = new RibbonButton();
                fGeomBtn.Name = "Geom";
                fGeomBtn.Text = "Complex\nauto";
                fGeomBtn.ShowText = true;
                fGeomBtn.ShowImage = true;
                fGeomBtn.Image = Images.getBitmap(Properties.Resources.geom);
                fGeomBtn.LargeImage = Images.getBitmap(Properties.Resources.geomLarge);
                fGeomBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fGeomBtn.Size = RibbonItemSize.Large;
                fGeomBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fGeomManBtn = new RibbonButton();
                fGeomManBtn.Name = "GeomMan";
                fGeomManBtn.Text = "Complex\nmanual";
                fGeomManBtn.ShowText = true;
                fGeomManBtn.ShowImage = true;
                fGeomManBtn.Image = Images.getBitmap(Properties.Resources.geomMan);
                fGeomManBtn.LargeImage = Images.getBitmap(Properties.Resources.geomManLarge);
                fGeomManBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fGeomManBtn.Size = RibbonItemSize.Large;
                fGeomManBtn.CommandHandler = new RibbonCommandHandler();

                fdsGeometryPanelSource.Items.Add(new RibbonSeparator());
                fdsGeometryPanelSource.Items.Add(fGeomBtn);
                fdsGeometryPanelSource.Items.Add(fGeomManBtn);

        #endregion

        #region FDS Ventilation Panel
                // FDS Ventilation Panel
                Autodesk.Windows.RibbonPanelSource fdsVentilationPanelSource = new RibbonPanelSource();
                fdsVentilationPanelSource.Title = "FDS Ventilation";
                RibbonPanel fdsVentilationPanel = new RibbonPanel();
                fdsVentilationPanel.Source = fdsVentilationPanelSource;
                Tab.Panels.Add(fdsVentilationPanel);

                RibbonButton fVentBtn = new RibbonButton();
                fVentBtn.Name = "Vent";
                fVentBtn.Text = "Vent";
                fVentBtn.ShowText = true;
                fVentBtn.ShowImage = true;
                fVentBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fVentBtn.LargeImage = Images.getBitmap(Properties.Resources.ventLarge);
                fVentBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fVentBtn.Size = RibbonItemSize.Large;
                fVentBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fJetfanBtn = new RibbonButton();
                fJetfanBtn.Name = "Jetfan";
                fJetfanBtn.Text = "Jetfan";
                fJetfanBtn.ShowText = true;
                fJetfanBtn.ShowImage = true;
                fJetfanBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fJetfanBtn.LargeImage = Images.getBitmap(Properties.Resources.jetfanLarge);
                fJetfanBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fJetfanBtn.Size = RibbonItemSize.Large;
                fJetfanBtn.CommandHandler = new RibbonCommandHandler();

                fdsVentilationPanelSource.Items.Add(fVentBtn);
                fdsVentilationPanelSource.Items.Add(fJetfanBtn);
        #endregion

        #region FDS Specie Panel
                // FDS Specie Panel
                Autodesk.Windows.RibbonPanelSource fdsSpeciePanelSource = new RibbonPanelSource();
                fdsSpeciePanelSource.Title = "FDS Specie";
                RibbonPanel fdsSpeciePanel = new RibbonPanel();
                fdsSpeciePanel.Source = fdsSpeciePanelSource;
                Tab.Panels.Add(fdsSpeciePanel);

                RibbonButton fSpecBtn = new RibbonButton();
                fSpecBtn.Name = "Specie";
                fSpecBtn.Text = "Specie";
                fSpecBtn.ShowText = true;
                fSpecBtn.ShowImage = true;
                fSpecBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fSpecBtn.LargeImage = Images.getBitmap(Properties.Resources.ventLarge);
                fSpecBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fSpecBtn.Size = RibbonItemSize.Large;
                fSpecBtn.CommandHandler = new RibbonCommandHandler();

                fdsSpeciePanelSource.Items.Add(fSpecBtn);
        #endregion

        #region FDS Fire Panel
                // FDS Fire Panel
                Autodesk.Windows.RibbonPanelSource fdsFirePanelSource = new RibbonPanelSource();
                fdsFirePanelSource.Title = "FDS Fire";
                RibbonPanel fdsFirePanel = new RibbonPanel();
                fdsFirePanel.Source = fdsFirePanelSource;
                Tab.Panels.Add(fdsFirePanel);

                RibbonButton fFireBtn = new RibbonButton();
                fFireBtn.Name = "Fire";
                fFireBtn.Text = "Fire";
                fFireBtn.ShowText = true;
                fFireBtn.ShowImage = true;
                fFireBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fFireBtn.LargeImage = Images.getBitmap(Properties.Resources.fireLarge);
                fFireBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fFireBtn.Size = RibbonItemSize.Large;
                fFireBtn.CommandHandler = new RibbonCommandHandler();

                fdsFirePanelSource.Items.Add(fFireBtn);
        #endregion

        #region FDS Output Panel
                // FDS Output Panel
                Autodesk.Windows.RibbonPanelSource fdsOutputPanelSource = new RibbonPanelSource();
                fdsOutputPanelSource.Title = "FDS Output";
                RibbonPanel fdsOutputPanel = new RibbonPanel();
                fdsOutputPanel.Source = fdsOutputPanelSource;
                Tab.Panels.Add(fdsOutputPanel);

                RibbonButton fDevcBtn = new RibbonButton();
                fDevcBtn.Name = "Devc";
                fDevcBtn.Text = "Devc";
                fDevcBtn.ShowText = true;
                fDevcBtn.ShowImage = true;
                fDevcBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fDevcBtn.LargeImage = Images.getBitmap(Properties.Resources.deviceLarge);
                fDevcBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fDevcBtn.Size = RibbonItemSize.Large;
                fDevcBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fSlcfBtn = new RibbonButton();
                fSlcfBtn.Name = "Slcf";
                fSlcfBtn.Text = "Slcf";
                fSlcfBtn.ShowText = true;
                fSlcfBtn.ShowImage = true;
                fSlcfBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fSlcfBtn.LargeImage = Images.getBitmap(Properties.Resources.sliceLarge);
                fSlcfBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fSlcfBtn.Size = RibbonItemSize.Large;
                fSlcfBtn.CommandHandler = new RibbonCommandHandler();

                fdsOutputPanelSource.Items.Add(fDevcBtn);
                fdsOutputPanelSource.Items.Add(fSlcfBtn);
        #endregion

        #region Layers Panel
                // Layers Panel
                Autodesk.Windows.RibbonPanelSource layersPanelSource = new RibbonPanelSource();
                layersPanelSource.Title = "Layers";
                RibbonPanel layersPanel = new RibbonPanel();
                layersPanel.Source = layersPanelSource;
                Tab.Panels.Add(layersPanel);

                //CreateBasicLayers
                RibbonButton lCreateBasicBtn = new RibbonButton();
                lCreateBasicBtn.Name = "CreateBasic";
                lCreateBasicBtn.Text = "Create\nbasic";
                lCreateBasicBtn.ShowText = true;
                lCreateBasicBtn.ShowImage = true;
                lCreateBasicBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                lCreateBasicBtn.LargeImage = Images.getBitmap(Properties.Resources.layersLarge);
                lCreateBasicBtn.Size = RibbonItemSize.Large;
                lCreateBasicBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                lCreateBasicBtn.CommandHandler = new RibbonCommandHandler();

                //CreateFdsLayer
                RibbonButton lCreateFdsBtn = new RibbonButton();
                lCreateFdsBtn.Name = "CreateFds";
                lCreateFdsBtn.Text = "Create\nFDS";
                lCreateFdsBtn.ShowText = true;
                lCreateFdsBtn.ShowImage = true;
                lCreateFdsBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                lCreateFdsBtn.LargeImage = Images.getBitmap(Properties.Resources.layersLarge);
                lCreateFdsBtn.Size = RibbonItemSize.Large;
                lCreateFdsBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                lCreateFdsBtn.CommandHandler = new RibbonCommandHandler();

                //HideFdsLayer
                //RibbonButton lHideFdsBtn = new RibbonButton();
                lHideFdsBtn.Name = "HideFds";
                lHideFdsBtn.Text = "Hide\nFDS";
                lHideFdsBtn.ShowText = true;
                lHideFdsBtn.ShowImage = true;
                lHideFdsBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                lHideFdsBtn.LargeImage = Images.getBitmap(Properties.Resources.layerOffLarge);
                lHideFdsBtn.Size = RibbonItemSize.Large;
                lHideFdsBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                lHideFdsBtn.CommandHandler = new RibbonCommandHandler();

                //HideOtherLayer
                //RibbonButton lHideOtherBtn = new RibbonButton();
                lHideOtherBtn.Name = "HideOther";
                lHideOtherBtn.Text = "Hide\nother";
                lHideOtherBtn.ShowText = true;
                lHideOtherBtn.ShowImage = true;
                lHideOtherBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                lHideOtherBtn.LargeImage = Images.getBitmap(Properties.Resources.layerOffLarge);
                lHideOtherBtn.Size = RibbonItemSize.Large;
                lHideOtherBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                lHideOtherBtn.CommandHandler = new RibbonCommandHandler();

                //CreateLayersForLevel
                RibbonButton lCreateLevelBtn = new RibbonButton();
                lCreateLevelBtn.Name = "CreateFdsLevel";
                lCreateLevelBtn.Text = "Add level";
                lCreateLevelBtn.ShowText = true;
                lCreateLevelBtn.ShowImage = true;
                lCreateLevelBtn.Image = Images.getBitmap(Properties.Resources.levelAdd);
                lCreateLevelBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                lCreateLevelBtn.Size = RibbonItemSize.Standard;
                //lCreateLevelBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                lCreateLevelBtn.CommandHandler = new RibbonCommandHandler();

                //HideForLevel
                RibbonButton lHideLevelBtn = new RibbonButton();
                lHideLevelBtn.Name = "HideLevel";
                lHideLevelBtn.Text = "Hide level";
                lHideLevelBtn.ShowText = true;
                lHideLevelBtn.ShowImage = true;
                lHideLevelBtn.Image = Images.getBitmap(Properties.Resources.levelHide);
                lHideLevelBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                lHideLevelBtn.Size = RibbonItemSize.Standard;
                lHideLevelBtn.CommandHandler = new RibbonCommandHandler();

                //ShowForLevel
                RibbonButton lShowLevelBtn = new RibbonButton();
                lShowLevelBtn.Name = "ShowLevel";
                lShowLevelBtn.Text = "Show level";
                lShowLevelBtn.ShowText = true;
                lShowLevelBtn.ShowImage = true;
                lShowLevelBtn.Image = Images.getBitmap(Properties.Resources.levelShow);
                lShowLevelBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                lShowLevelBtn.Size = RibbonItemSize.Standard;
                lShowLevelBtn.CommandHandler = new RibbonCommandHandler();

                RibbonRowPanel lLayersLevelRow = new RibbonRowPanel();
                lLayersLevelRow.Items.Add(lCreateLevelBtn);
                lLayersLevelRow.Items.Add(new RibbonRowBreak());
                lLayersLevelRow.Items.Add(lHideLevelBtn);
                lLayersLevelRow.Items.Add(new RibbonRowBreak());
                lLayersLevelRow.Items.Add(lShowLevelBtn);


                layersPanelSource.Items.Add(lCreateBasicBtn);
                layersPanelSource.Items.Add(lCreateFdsBtn);
                layersPanelSource.Items.Add(new RibbonSeparator());
                layersPanelSource.Items.Add(lHideFdsBtn);
                layersPanelSource.Items.Add(lHideOtherBtn);
                layersPanelSource.Items.Add(new RibbonSeparator());
                layersPanelSource.Items.Add(lLayersLevelRow);
        #endregion
#endif

        #region Sync Panel

#if AAMKS
                // Sync Panel
                Autodesk.Windows.RibbonPanelSource syncPanelSource = new RibbonPanelSource();
                syncPanelSource.Title = "Sync";
                syncPanel.Source = syncPanelSource;
                Tab.Panels.Add(syncPanel);

                RibbonButton sCfastBtn = new RibbonButton();
                sCfastBtn.Name = "sCFAST";
                sCfastBtn.Text = "Export\nCFAST";
                sCfastBtn.ShowText = true;
                sCfastBtn.ShowImage = true;
                sCfastBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                sCfastBtn.LargeImage = Images.getBitmap(Properties.Resources.exportLarge);
                sCfastBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                sCfastBtn.Size = RibbonItemSize.Large;
                sCfastBtn.CommandHandler = new RibbonCommandHandler();
#endif
#if WIZFDS
                RibbonButton sFdsBtn = new RibbonButton();
                sFdsBtn.Name = "sFDS";
                sFdsBtn.Text = "Export\nFDS";
                sFdsBtn.ShowText = true;
                sFdsBtn.ShowImage = true;
                sFdsBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                sFdsBtn.LargeImage = Images.getBitmap(Properties.Resources.exportLarge);
                sFdsBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                sFdsBtn.Size = RibbonItemSize.Large;
                sFdsBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton sFdsSelectBtn = new RibbonButton();
                sFdsSelectBtn.Name = "sFDSSelect";
                sFdsSelectBtn.Text = "Select\nFDS object";
                sFdsSelectBtn.ShowText = true;
                sFdsSelectBtn.ShowImage = true;
                sFdsSelectBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                sFdsSelectBtn.LargeImage = Images.getBitmap(Properties.Resources.selectLarge);
                sFdsSelectBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                sFdsSelectBtn.Size = RibbonItemSize.Large;
                sFdsSelectBtn.CommandHandler = new RibbonCommandHandler();
#endif

                // Websocket button
                sWebsocketBtn.Name = "sWebsocket";
                if (RibbonInit.isWebSockedInited == false)
                {
                    sWebsocketBtn.Text = "Websocket\nclosed";
                    sWebsocketBtn.LargeImage = Images.getBitmap(Properties.Resources.websocCloseLarge);
                }
                else
                {
                    sWebsocketBtn.Text = "Websocket\nopened";
                    sWebsocketBtn.LargeImage = Images.getBitmap(Properties.Resources.websocOpenLarge);
                }
                sWebsocketBtn.ShowText = true;
                sWebsocketBtn.ShowImage = true;
                sWebsocketBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                sWebsocketBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                sWebsocketBtn.Size = RibbonItemSize.Large;
                sWebsocketBtn.CommandHandler = new RibbonCommandHandler();

#if AAMKS
                syncPanelSource.Items.Add(sCfastBtn);
                syncPanelSource.Items.Add(new RibbonSeparator());
#endif
#if WIZFDS
                syncPanelSource.Items.Add(sFdsBtn);
                syncPanelSource.Items.Add(sFdsSelectBtn);
                syncPanelSource.Items.Add(new RibbonSeparator());
                syncPanelSource.Items.Add(sWebsocketBtn);
#endif
        #endregion

                RibbonInit.isRibbonInited = true;
                if (RibbonInit.isWebSockedInited == false)
                    syncPanel.IsEnabled = false;
                Tab.IsVisible = true;
                Tab.IsActive = true;

    }
            catch (System.Exception)
            {
               
            }
        }
        public class RibbonCommandHandler : System.Windows.Input.ICommand
        {
            public bool CanExecute(object parameter)
            {
                return true;
            }

            public event EventHandler CanExecuteChanged;

            public void Execute(object parameter)
            {
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                if (parameter is RibbonButton)
                {
                    RibbonButton button = parameter as RibbonButton;
                    switch (button.Name)
                    {
                        // CFAST
                        case "Room":
                            acDoc.SendStringToExecute("cRoom\n", true, false, true);
                            break;
                        case "Corridor":
                            acDoc.SendStringToExecute("cCorridor\n", true, false, true);
                            break;
                        case "Hall":
                            acDoc.SendStringToExecute("cHall\n", true, false, true);
                            break;
                        case "Staircase":
                            acDoc.SendStringToExecute("cStaircase\n", true, false, true);
                            break;
                        case "Door":
                            acDoc.SendStringToExecute("cDoor\n", true, false, true);
                            break;
                        case "Window":
                            acDoc.SendStringToExecute("cWindow\n", true, false, true);
                            break;
                        case "Inlet":
                            acDoc.SendStringToExecute("cInlet\n", true, false, true);
                            break;
                        case "Vvent":
                            acDoc.SendStringToExecute("cVvent\n", true, false, true);
                            break;
                        case "Mvent":
                            acDoc.SendStringToExecute("cMvent\n", true, false, true);
                            break;
                        case "Holeaut":
                            acDoc.SendStringToExecute("cHole\n", true, false, true);
                            break;
                        case "Holeman":
                            acDoc.SendStringToExecute("cHoleman\n", true, false, true);
                            break;

                        // FDS
                        case "Mesh":
                            acDoc.SendStringToExecute("fMesh\n", true, false, true);
                            break;
                        case "MeshAuto":
                            acDoc.SendStringToExecute("fMeshauto\n", true, false, true);
                            break;
                        case "Open":
                            acDoc.SendStringToExecute("fOpen\n", true, false, true);
                            break;
                        case "OpenVisual":
                            acDoc.SendStringToExecute("fOpenVisual\n", true, false, true);
                            break;
                        case "OpenManual":
                            acDoc.SendStringToExecute("fOpenManual\n", true, false, true);
                            break;
                        case "Obst":
                            acDoc.SendStringToExecute("fObst\n", true, false, true);
                            break;
                        case "Hole":
                            acDoc.SendStringToExecute("fHole\n", true, false, true);
                            break;
                        case "Wall":
                            acDoc.SendStringToExecute("fWall\n", true, false, true);
                            break;
                        case "Ceiling":
                            acDoc.SendStringToExecute("fCeiling\n", true, false, true);
                            break;
                        case "CWall":
                            acDoc.SendStringToExecute("fCWall\n", true, false, true);
                            break;
                        case "Geom":
                            acDoc.SendStringToExecute("fSolMesh\n", true, false, true);
                            break;
                        case "GeomMan":
                            acDoc.SendStringToExecute("_MeshOptions\n", true, false, true);
                            break;
                        case "Vent":
                            acDoc.SendStringToExecute("fVent\n", true, false, true);
                            break;
                        case "Jetfan":
                            acDoc.SendStringToExecute("fJetfan\n", true, false, true);
                            break;
                        case "Specie":
                            acDoc.SendStringToExecute("fSpec\n", true, false, true);
                            break;
                        case "Fire":
                            acDoc.SendStringToExecute("fFire\n", true, false, true);
                            break;
                        case "Devc":
                            acDoc.SendStringToExecute("fDevc\n", true, false, true);
                            break;
                        case "Slcf":
                            acDoc.SendStringToExecute("fSlcf\n", true, false, true);
                            break;
                        case "CreateBasic":
                            acDoc.SendStringToExecute("fCreateBasicLayers\n", true, false, true);
                            break;
                        case "CreateFds":
                            acDoc.SendStringToExecute("fCreateFdsLayer\n", true, false, true);
                            break;
                        case "CreateLevel":
                            acDoc.SendStringToExecute("\n", true, false, true);
                            break;
                        case "HideFds":
                            if(RibbonInit.isFdsLayersHidden)
                            {
                                acDoc.SendStringToExecute("fShowFdsLayers\n", true, false, true);
                                RibbonInit.isFdsLayersHidden = false;
                                lHideFdsBtn.Text = "Hide\nFDS";
                                // Tutaj zmiana ikonki, tekstu
                            }
                            else
                            {
                                acDoc.SendStringToExecute("fHideFdsLayers\n", true, false, true);
                                RibbonInit.isFdsLayersHidden = true;
                                lHideFdsBtn.Text = "Show\nFDS";
                                // Tutaj zmiana ikonki, tekstu
                            }
                            break;
                        case "HideOther":
                            if(RibbonInit.isOtherLayersHidden)
                            {
                                acDoc.SendStringToExecute("fShowOtherLayers\n", true, false, true);
                                RibbonInit.isOtherLayersHidden = false;
                                lHideOtherBtn.Text = "Hide\nother";
                                // Tutaj zmiana ikonki, tekstu
                            }
                            else
                            {
                                acDoc.SendStringToExecute("fHideOtherLayers\n", true, false, true);
                                RibbonInit.isOtherLayersHidden = true;
                                lHideOtherBtn.Text = "Show\nother";
                                // Tutaj zmiana ikonki, tekstu
                            }
                            break;
                        case "HideLevel":
                            acDoc.SendStringToExecute("fHideLevel\n", true, false, true);
                            break;
                        case "ShowLevel":
                            acDoc.SendStringToExecute("fShowLevel\n", true, false, true);
                            break;
                        case "CreateFdsLevel":
                            acDoc.SendStringToExecute("fCreateLevel\n", true, false, true);
                            break;
                        
                        // Sync
                        case "sFDS":
                            acDoc.SendStringToExecute("fExport\n", true, false, true);
                            break;
                        case "sFDSSelect":
                            acDoc.SendStringToExecute("fSelect\n", true, false, true);
                            break;
                        case "sCFAST":
                            acDoc.SendStringToExecute("cExport\n", true, false, true);
                            break;

                        // Utils
                        case "3dorbit":
                            acDoc.SendStringToExecute("_3dorbit\n", true, false, true);
                            break;
                        case "zoomextents":
                            acDoc.SendStringToExecute("_zoom _e\n", true, false, true);
                            break;
                        case "dist":
                            acDoc.SendStringToExecute("_dist\n", true, false, true);
                            break;
                        case "area":
                            acDoc.SendStringToExecute("_measuregeom _ar\n", true, false, true);
                            break;
                        case "Top":
                            acDoc.SendStringToExecute("_-view _top\n", true, false, true);
                            break;
                        case "Bottom":
                            acDoc.SendStringToExecute("_-view _bottom\n", true, false, true);
                            break;
                        case "Front":
                            acDoc.SendStringToExecute("_-view _front\n", true, false, true);
                            break;
                        case "Back":
                            acDoc.SendStringToExecute("_-view _back\n", true, false, true);
                            break;
                        case "Right":
                            acDoc.SendStringToExecute("_-view _right\n", true, false, true);
                            break;
                        case "Left":
                            acDoc.SendStringToExecute("_-view _left\n", true, false, true);
                            break;
                        
                    }
                }
            }
        }
#endif

#if BRX_APP
        // BricsCAD Ribbon
        public static void InitBrxRibbon()
        {
            try
            {
                RibbonControl ribbonControl = ComponentManager.Ribbon;
                RibbonTab Tab = new RibbonTab();
                Tab.Title = "WizFDS";
                Tab.Id = "wizfds_id2586";
                ribbonControl.Tabs.Add(Tab);

#if AAMKS
#region Cfast panel
                // Cfast Panel
                RibbonPanelSource cfastPanelSource = new RibbonPanelSource();
                cfastPanelSource.Title = "CFAST model";
                cfastPanel.Source = cfastPanelSource;
                Tab.Panels.Add(cfastPanel);

                // Cfast buttons
                RibbonButton cRoomBtn = new RibbonButton();
                cRoomBtn.Text = "Room";
                cRoomBtn.ExternalImage = true;
                cRoomBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                cRoomBtn.LargeImage = Images.getBitmapPath(Properties.Resources.obstLarge, "obstLarge");
                cRoomBtn.CommandParameter = "cRoom";
                cRoomBtn.ButtonStyle = 0;
                cRoomBtn.ToolTip = "Room";

                RibbonButton cCorridorBtn = new RibbonButton();
                cCorridorBtn.Text = "Corridor";
                cCorridorBtn.ExternalImage = true;
                cCorridorBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                cCorridorBtn.LargeImage = Images.getBitmapPath(Properties.Resources.corridorLarge, "corridorLarge");
                cCorridorBtn.CommandParameter = "cCorridor";
                cCorridorBtn.ButtonStyle = 0;
                cCorridorBtn.ToolTip = "Corridor";

                RibbonButton cHallBtn = new RibbonButton();
                cHallBtn.Text = "Hall";
                cHallBtn.ExternalImage = true;
                cHallBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                cHallBtn.LargeImage = Images.getBitmapPath(Properties.Resources.obstLarge, "obstLarge");
                cHallBtn.CommandParameter = "cHall";
                cHallBtn.ButtonStyle = 0;
                cHallBtn.ToolTip = "Hall";

                RibbonButton cStairBtn = new RibbonButton();
                cStairBtn.Text = "Staircase";
                cStairBtn.ExternalImage = true;
                cStairBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                cStairBtn.LargeImage = Images.getBitmapPath(Properties.Resources.staircaseLarge, "staircaseLarge");
                cStairBtn.CommandParameter = "cStaircase";
                cStairBtn.ButtonStyle = 0;
                cStairBtn.ToolTip = "Staircase";

                // Add to main panel
                RibbonSeparator separator = new RibbonSeparator();
                separator.SeparatorStyle = RibbonSeparatorStyle.Line;

                cfastPanelSource.Items.Add(cRoomBtn);
                cfastPanelSource.Items.Add(cCorridorBtn);
                cfastPanelSource.Items.Add(cHallBtn);
                cfastPanelSource.Items.Add(cStairBtn);
                cfastPanelSource.Items.Add(separator);

                RibbonButton cDoorBtn = new RibbonButton();
                cDoorBtn.Text = "Door";
                cDoorBtn.ExternalImage = true;
                cDoorBtn.Image = Images.getBitmapPath(Properties.Resources.door, "door");
                cDoorBtn.LargeImage = Images.getBitmapPath(Properties.Resources.doorLarge, "doorLarge");
                cDoorBtn.CommandParameter = "cDoor";
                cDoorBtn.ButtonStyle = 0;
                cDoorBtn.ToolTip = "Door";

                RibbonButton cWindowBtn = new RibbonButton();
                cWindowBtn.Text = "Window";
                cWindowBtn.ExternalImage = true;
                cWindowBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                cWindowBtn.LargeImage = Images.getBitmapPath(Properties.Resources.windowLarge, "windowLarge");
                cWindowBtn.CommandParameter = "cWindow";
                cWindowBtn.ButtonStyle = 0;
                cWindowBtn.ToolTip = "Window";

                RibbonButton cInletBtn = new RibbonButton();
                cInletBtn.Text = "Inlet";
                cInletBtn.ExternalImage = true;
                cInletBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                cInletBtn.LargeImage = Images.getBitmapPath(Properties.Resources.inletLarge, "inletLarge");
                cInletBtn.CommandParameter = "cInlet";
                cInletBtn.ButtonStyle = 0;
                cInletBtn.ToolTip = "Inlet";

                cfastPanelSource.Items.Add(cDoorBtn);
                cfastPanelSource.Items.Add(cWindowBtn);
                cfastPanelSource.Items.Add(cInletBtn);

                RibbonButton cVventBtn = new RibbonButton();
                cVventBtn.Text = "Vvent";
                cVventBtn.ExternalImage = true;
                cVventBtn.Image = Images.getBitmapPath(Properties.Resources.vent, "vent");
                cVventBtn.LargeImage = Images.getBitmapPath(Properties.Resources.ventLarge, "ventLarge");
                cVventBtn.CommandParameter = "cVvent";
                cVventBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                cVventBtn.ToolTip = "Vertical vent";

                RibbonButton cHoleBtn = new RibbonButton();
                cHoleBtn.Text = "Auto Hole";
                cHoleBtn.ExternalImage = true;
                cHoleBtn.Image = Images.getBitmapPath(Properties.Resources.holeaut, "holeaut");
                cHoleBtn.LargeImage = Images.getBitmapPath(Properties.Resources.defaultIcoLarge, "defaultIcoLarge");
                cHoleBtn.CommandParameter = "cHole";
                cHoleBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                cHoleBtn.ToolTip = "Auto hole";

                RibbonButton cHolemanBtn = new RibbonButton();
                cHolemanBtn.Text = "Hole";
                cHolemanBtn.ExternalImage = true;
                cHolemanBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                cHolemanBtn.LargeImage = Images.getBitmapPath(Properties.Resources.defaultIcoLarge, "defaultIcoLarge");
                cHolemanBtn.CommandParameter = "cHoleman";
                cHolemanBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                cHolemanBtn.ToolTip = "Hole";

                // Create row panel 
                RibbonRowPanel cVentRow = new RibbonRowPanel();
                cVentRow.Items.Add(cVventBtn);
                cVentRow.Items.Add(new RibbonRowBreak());
                cVentRow.Items.Add(cHoleBtn);
                cVentRow.Items.Add(new RibbonRowBreak());
                cVentRow.Items.Add(cHolemanBtn);

                cfastPanelSource.Items.Add(cVentRow);
#endregion
#endif

#if WIZFDS
#region FDS Geometry Panel
                // FDS Geometry Panel
                RibbonPanelSource fdsGeometryPanelSource = new RibbonPanelSource();
                fdsGeometryPanelSource.Title = "FDS Geometry";
                RibbonPanel fdsGeometryPanel = new RibbonPanel();
                fdsGeometryPanel.Source = fdsGeometryPanelSource;
                Tab.Panels.Add(fdsGeometryPanel);

                // FDS buttons
                RibbonButton fMeshBtn = new RibbonButton();
                fMeshBtn.Text = "Mesh";
                fMeshBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fMeshBtn.LargeImage = Images.getBitmapPath(Properties.Resources.meshLarge, "meshLarge");
                fMeshBtn.ExternalImage = true;
                fMeshBtn.CommandParameter = "fMesh";
                fMeshBtn.ButtonStyle = 0;
                fMeshBtn.ToolTip = "Mesh";

                RibbonButton fMeshAutoBtn = new RibbonButton();
                fMeshAutoBtn.Text = "Mesh\nauto";
                fMeshAutoBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fMeshAutoBtn.LargeImage = Images.getBitmapPath(Properties.Resources.meshLarge, "meshLarge");
                fMeshAutoBtn.ExternalImage = true;
                fMeshAutoBtn.CommandParameter = "fMeshAuto";
                fMeshAutoBtn.ButtonStyle = 0;
                fMeshAutoBtn.ToolTip = "MeshAuto";

                RibbonButton fOpenBtn = new RibbonButton();
                fOpenBtn.Text = "Open";
                fOpenBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fOpenBtn.LargeImage = Images.getBitmapPath(Properties.Resources.openLarge, "openLarge");
                fOpenBtn.ExternalImage = true;
                fOpenBtn.CommandParameter = "fOpen";
                fOpenBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                fOpenBtn.ToolTip = "Open";

                RibbonButton fOpenVisualBtn = new RibbonButton();
                fOpenVisualBtn.Text = "Visual open";
                fOpenVisualBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fOpenVisualBtn.LargeImage = Images.getBitmapPath(Properties.Resources.openLarge, "openLarge");
                fOpenVisualBtn.ExternalImage = true;
                fOpenVisualBtn.CommandParameter = "fOpenVisual";
                fOpenVisualBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                fOpenVisualBtn.ToolTip = "OpenVisual";

                RibbonButton fOpenManualBtn = new RibbonButton();
                fOpenManualBtn.Text = "Manual open";
                fOpenManualBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fOpenManualBtn.LargeImage = Images.getBitmapPath(Properties.Resources.openLarge, "openLarge");
                fOpenManualBtn.ExternalImage = true;
                fOpenManualBtn.CommandParameter = "fOpenManual";
                fOpenManualBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                fOpenManualBtn.ToolTip = "OpenManual";

                // Add to main panel
                RibbonRowPanel fOpenRow = new RibbonRowPanel();
                fOpenRow.Items.Add(fOpenBtn);
                fOpenRow.Items.Add(new RibbonRowBreak());
                fOpenRow.Items.Add(fOpenVisualBtn);
                fOpenRow.Items.Add(new RibbonRowBreak());
                fOpenRow.Items.Add(fOpenManualBtn);

                RibbonSeparator separator1 = new RibbonSeparator();
                separator1.SeparatorStyle = RibbonSeparatorStyle.Line;

                fdsGeometryPanelSource.Items.Add(fMeshBtn);
                fdsGeometryPanelSource.Items.Add(fMeshAutoBtn);
                fdsGeometryPanelSource.Items.Add(fOpenRow);
                fdsGeometryPanelSource.Items.Add(separator1);

                RibbonButton fObstBtn = new RibbonButton();
                fObstBtn.Text = "Obst";
                fObstBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fObstBtn.LargeImage = Images.getBitmapPath(Properties.Resources.obstLarge, "obstLarge");
                fObstBtn.ExternalImage = true;
                fObstBtn.CommandParameter = "fObst";
                fObstBtn.ButtonStyle = 0;
                fObstBtn.ToolTip = "Obst";

                RibbonButton fHoleBtn = new RibbonButton();
                fHoleBtn.Text = "Hole";
                fHoleBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fHoleBtn.LargeImage = Images.getBitmapPath(Properties.Resources.obstLarge, "obstLarge");
                fHoleBtn.ExternalImage = true;
                fHoleBtn.CommandParameter = "fHole";
                fHoleBtn.ButtonStyle = 0;
                fHoleBtn.ToolTip = "Hole";

                RibbonButton fWallBtn = new RibbonButton();
                fWallBtn.Text = "Wall";
                fWallBtn.Image = Images.getBitmapPath(Properties.Resources.wall, "wall");
                fWallBtn.LargeImage = Images.getBitmapPath(Properties.Resources.wallLarge, "wallLarge");
                fWallBtn.ExternalImage = true;
                fWallBtn.CommandParameter = "fWall";
                fWallBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                fWallBtn.ToolTip = "Wall";

                RibbonButton fCeilingBtn = new RibbonButton();
                fCeilingBtn.Text = "Ceiling";
                fCeilingBtn.Image = Images.getBitmapPath(Properties.Resources.ceiling, "ceiling");
                fCeilingBtn.LargeImage = Images.getBitmapPath(Properties.Resources.defaultIcoLarge, "defaultIcoLarge");
                fCeilingBtn.ExternalImage = true;
                fCeilingBtn.CommandParameter = "fCeiling";
                fCeilingBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                fCeilingBtn.ToolTip = "Ceiling";

                RibbonButton fCWallBtn = new RibbonButton();
                fCWallBtn.Text = "CWall";
                fCWallBtn.Image = Images.getBitmapPath(Properties.Resources.cwall, "cwall");
                fCWallBtn.LargeImage = Images.getBitmapPath(Properties.Resources.wallLarge, "wallLarge");
                fCWallBtn.ExternalImage = true;
                fCWallBtn.CommandParameter = "fCWall";
                fCWallBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                fCWallBtn.ToolTip = "CWall";

                // Create row panel 
                RibbonRowPanel fGeometryRow = new RibbonRowPanel();
                fGeometryRow.Items.Add(fWallBtn);
                fGeometryRow.Items.Add(new RibbonRowBreak());
                fGeometryRow.Items.Add(fCeilingBtn);
                fGeometryRow.Items.Add(new RibbonRowBreak());
                fGeometryRow.Items.Add(fCWallBtn);

                fdsGeometryPanelSource.Items.Add(fObstBtn);
                fdsGeometryPanelSource.Items.Add(fHoleBtn);
                fdsGeometryPanelSource.Items.Add(fGeometryRow);

                RibbonButton fGeomBtn = new RibbonButton();
                fGeomBtn.Text = "Complex\nauto";
                fGeomBtn.Image = Images.getBitmapPath(Properties.Resources.geom, "geom");
                fGeomBtn.LargeImage = Images.getBitmapPath(Properties.Resources.geomLarge, "geomLarge");
                fGeomBtn.ExternalImage = true;
                fGeomBtn.CommandParameter = "fGeom";
                fGeomBtn.ButtonStyle = 0;
                fGeomBtn.ToolTip = "Geom";

                RibbonButton fGeomManBtn = new RibbonButton();
                fGeomManBtn.Text = "Complex\nmanual";
                fGeomManBtn.Image = Images.getBitmapPath(Properties.Resources.geomMan, "geomMan");
                fGeomManBtn.LargeImage = Images.getBitmapPath(Properties.Resources.geomManLarge, "geomManLarge");
                fGeomManBtn.ExternalImage = true;
                fGeomManBtn.CommandParameter = "fGeomMan";
                fGeomManBtn.ButtonStyle = 0;
                fGeomManBtn.ToolTip = "GeomMan";

                RibbonSeparator separator2 = new RibbonSeparator();
                separator2.SeparatorStyle = RibbonSeparatorStyle.Line;

                fdsGeometryPanelSource.Items.Add(separator2);
                fdsGeometryPanelSource.Items.Add(fGeomBtn);
                fdsGeometryPanelSource.Items.Add(fGeomManBtn);

#endregion
#region FDS Ventilation Panel
                // FDS Ventilation Panel
                RibbonPanelSource fdsVentilationPanelSource = new RibbonPanelSource();
                fdsVentilationPanelSource.Title = "FDS Ventilation";
                RibbonPanel fdsVentilationPanel = new RibbonPanel();
                fdsVentilationPanel.Source = fdsVentilationPanelSource;
                Tab.Panels.Add(fdsVentilationPanel);

                RibbonButton fVentBtn = new RibbonButton();
                fVentBtn.Text = "Vent";
                fVentBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fVentBtn.LargeImage = Images.getBitmapPath(Properties.Resources.ventLarge, "ventLarge");
                fVentBtn.ExternalImage = true;
                fVentBtn.CommandParameter = "fVent";
                fVentBtn.ButtonStyle = 0;
                fVentBtn.ToolTip = "Vent";

                RibbonButton fJetfanBtn = new RibbonButton();
                fJetfanBtn.Text = "Jetfan";
                fJetfanBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fJetfanBtn.LargeImage = Images.getBitmapPath(Properties.Resources.jetfanLarge, "jetfanLarge");
                fJetfanBtn.ExternalImage = true;
                fJetfanBtn.CommandParameter = "fJetfan";
                fJetfanBtn.ButtonStyle = 0;
                fJetfanBtn.ToolTip = "Jetfan";

                fdsVentilationPanelSource.Items.Add(fVentBtn);
                fdsVentilationPanelSource.Items.Add(fJetfanBtn);
#endregion
#region FDS Specie Panel
                // FDS Specie Panel
                RibbonPanelSource fdsSpeciePanelSource = new RibbonPanelSource();
                fdsSpeciePanelSource.Title = "FDS Specie";
                RibbonPanel fdsSpeciePanel = new RibbonPanel();
                fdsSpeciePanel.Source = fdsSpeciePanelSource;
                Tab.Panels.Add(fdsSpeciePanel);

                RibbonButton fSpecBtn = new RibbonButton();
                fSpecBtn.Text = "Specie";
                fSpecBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fSpecBtn.LargeImage = Images.getBitmapPath(Properties.Resources.ventLarge, "ventLarge");
                fSpecBtn.ExternalImage = true;
                fSpecBtn.CommandParameter = "fSpec";
                fSpecBtn.ButtonStyle = 0;
                fSpecBtn.ToolTip = "Spec";

                fdsSpeciePanelSource.Items.Add(fSpecBtn);
#endregion
#region FDS Fire Panel
                // FDS Fire Panel
                RibbonPanelSource fdsFirePanelSource = new RibbonPanelSource();
                fdsFirePanelSource.Title = "FDS Fire";
                RibbonPanel fdsFirePanel = new RibbonPanel();
                fdsFirePanel.Source = fdsFirePanelSource;
                Tab.Panels.Add(fdsFirePanel);

                RibbonButton fFireBtn = new RibbonButton();
                fFireBtn.Text = "Fire";
                fFireBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fFireBtn.LargeImage = Images.getBitmapPath(Properties.Resources.fireLarge, "fireLarge");
                fFireBtn.ExternalImage = true;
                fFireBtn.CommandParameter = "fFire";
                fFireBtn.ButtonStyle = 0;
                fFireBtn.ToolTip = "Fire";

                fdsFirePanelSource.Items.Add(fFireBtn);
#endregion
#region FDS Output Panel
                // FDS Output Panel
                RibbonPanelSource fdsOutputPanelSource = new RibbonPanelSource();
                fdsOutputPanelSource.Title = "FDS Output";
                RibbonPanel fdsOutputPanel = new RibbonPanel();
                fdsOutputPanel.Source = fdsOutputPanelSource;
                Tab.Panels.Add(fdsOutputPanel);

                RibbonButton fDevcBtn = new RibbonButton();
                fDevcBtn.Text = "Devc";
                fDevcBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fDevcBtn.LargeImage = Images.getBitmapPath(Properties.Resources.deviceLarge, "deviceLarge");
                fDevcBtn.ExternalImage = true;
                fDevcBtn.CommandParameter = "fDevc";
                fDevcBtn.ButtonStyle = 0;
                fDevcBtn.ToolTip = "Devc";

                RibbonButton fSlcfBtn = new RibbonButton();
                fSlcfBtn.Text = "Slcf";
                fSlcfBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                fSlcfBtn.LargeImage = Images.getBitmapPath(Properties.Resources.sliceLarge, "sliceLarge");
                fSlcfBtn.ExternalImage = true;
                fSlcfBtn.CommandParameter = "fSlcf";
                fSlcfBtn.ButtonStyle = 0;
                fSlcfBtn.ToolTip = "Slcf";

                fdsOutputPanelSource.Items.Add(fDevcBtn);
                fdsOutputPanelSource.Items.Add(fSlcfBtn);
#endregion
#region Layers Panel
                // Layers Panel
                RibbonPanelSource layersPanelSource = new RibbonPanelSource();
                layersPanelSource.Title = "Layers";
                RibbonPanel layersPanel = new RibbonPanel();
                layersPanel.Source = layersPanelSource;
                Tab.Panels.Add(layersPanel);

                //CreateBasicLayers
                RibbonButton lCreateBasicBtn = new RibbonButton();
                lCreateBasicBtn.Text = "Create\nbasic";
                lCreateBasicBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                lCreateBasicBtn.LargeImage = Images.getBitmapPath(Properties.Resources.layersLarge, "layersLarge");
                lCreateBasicBtn.ExternalImage = true;
                lCreateBasicBtn.CommandParameter = "fCreateBasic";
                lCreateBasicBtn.ButtonStyle = 0;
                lCreateBasicBtn.ToolTip = "CreateBasic";

                //CreateFdsLayer
                RibbonButton lCreateFdsBtn = new RibbonButton();
                lCreateFdsBtn.Text = "Create\nFDS";
                lCreateFdsBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                lCreateFdsBtn.LargeImage = Images.getBitmapPath(Properties.Resources.layersLarge, "layersLarge");
                lCreateFdsBtn.ExternalImage = true;
                lCreateFdsBtn.CommandParameter = "fCreateFds";
                lCreateFdsBtn.ButtonStyle = 0;
                lCreateFdsBtn.ToolTip = "CreateFds";

                //HideFdsLayer
                //RibbonButton lHideFdsBtn = new RibbonButton();
                lHideFdsBtn.Text = "Hide\nFDS";
                lHideFdsBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                lHideFdsBtn.LargeImage = Images.getBitmapPath(Properties.Resources.layerOffLarge, "layerOffLarge");
                lHideFdsBtn.ExternalImage = true;
                lHideFdsBtn.CommandParameter = "fHideFds";
                lHideFdsBtn.ButtonStyle = 0;
                lHideFdsBtn.ToolTip = "HideFds";

                //HideOtherLayer
                //RibbonButton lHideOtherBtn = new RibbonButton();
                lHideOtherBtn.Text = "Hide\nother";
                lHideOtherBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                lHideOtherBtn.LargeImage = Images.getBitmapPath(Properties.Resources.layerOffLarge, "layerOffLarge");
                lHideOtherBtn.ExternalImage = true;
                lHideOtherBtn.CommandParameter = "fHideOther";
                lHideOtherBtn.ButtonStyle = 0;
                lHideOtherBtn.ToolTip = "HideOther";

                //CreateLayersForLevel
                RibbonButton lCreateLevelBtn = new RibbonButton();
                lCreateLevelBtn.Text = "Add level";
                lCreateLevelBtn.Image = Images.getBitmapPath(Properties.Resources.levelAdd, "levelAdd");
                lCreateLevelBtn.LargeImage = Images.getBitmapPath(Properties.Resources.defaultIcoLarge, "defaultIcoLarge");
                lCreateLevelBtn.ExternalImage = true;
                lCreateLevelBtn.CommandParameter = "fCreateLevel";
                lCreateLevelBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                lCreateLevelBtn.ToolTip = "CreateLevel";

                //HideForLevel
                RibbonButton lHideLevelBtn = new RibbonButton();
                lHideLevelBtn.Text = "Hide level";
                lHideLevelBtn.Image = Images.getBitmapPath(Properties.Resources.levelHide, "levelHide");
                lHideLevelBtn.LargeImage = Images.getBitmapPath(Properties.Resources.defaultIcoLarge, "defaultIcoLarge");
                lHideLevelBtn.ExternalImage = true;
                lHideLevelBtn.CommandParameter = "fHideLevel";
                lHideLevelBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                lHideLevelBtn.ToolTip = "HideLevel";

                //ShowForLevel
                RibbonButton lShowLevelBtn = new RibbonButton();
                lShowLevelBtn.Text = "Show level";
                lShowLevelBtn.Image = Images.getBitmapPath(Properties.Resources.levelShow, "levelShow");
                lShowLevelBtn.LargeImage = Images.getBitmapPath(Properties.Resources.defaultIcoLarge, "defaultIcoLarge");
                lShowLevelBtn.ExternalImage = true;
                lShowLevelBtn.CommandParameter = "fShowLevel";
                lShowLevelBtn.ButtonStyle = RibbonButtonStyle.SmallWithText;
                lShowLevelBtn.ToolTip = "ShowLevel";

                RibbonRowPanel lLayersLevelRow = new RibbonRowPanel();
                lLayersLevelRow.Items.Add(lCreateLevelBtn);
                lLayersLevelRow.Items.Add(new RibbonRowBreak());
                lLayersLevelRow.Items.Add(lHideLevelBtn);
                lLayersLevelRow.Items.Add(new RibbonRowBreak());
                lLayersLevelRow.Items.Add(lShowLevelBtn);

                RibbonSeparator separator3 = new RibbonSeparator();
                separator3.SeparatorStyle = RibbonSeparatorStyle.Line;
                RibbonSeparator separator4 = new RibbonSeparator();
                separator4.SeparatorStyle = RibbonSeparatorStyle.Line;


                layersPanelSource.Items.Add(lCreateBasicBtn);
                layersPanelSource.Items.Add(lCreateFdsBtn);
                layersPanelSource.Items.Add(separator3);
                layersPanelSource.Items.Add(lHideFdsBtn);
                layersPanelSource.Items.Add(lHideOtherBtn);
                layersPanelSource.Items.Add(separator4);
                layersPanelSource.Items.Add(lLayersLevelRow);
#endregion
#endif
#region Sync Panel

                // Sync Panel
                RibbonPanelSource syncPanelSource = new RibbonPanelSource();
                syncPanelSource.Title = "Sync";
                syncPanel.Source = syncPanelSource;
                Tab.Panels.Add(syncPanel);

                RibbonButton sCfastBtn = new RibbonButton();
                sCfastBtn.Text = "Export\nCFAST";
                sCfastBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                sCfastBtn.LargeImage = Images.getBitmapPath(Properties.Resources.exportLarge, "exportLarge");
                sCfastBtn.ExternalImage = true;
                sCfastBtn.CommandParameter = "cExport";
                sCfastBtn.ButtonStyle = RibbonButtonStyle.LargeWithText;
                sCfastBtn.ToolTip = "Export CFAST";

                RibbonButton sFdsBtn = new RibbonButton();
                sFdsBtn.Text = "Export\nFDS";
                sFdsBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                sFdsBtn.LargeImage = Images.getBitmapPath(Properties.Resources.exportLarge, "exportLarge");
                sFdsBtn.ExternalImage = true;
                sFdsBtn.CommandParameter = "fExport";
                sFdsBtn.ButtonStyle = RibbonButtonStyle.LargeWithText;
                sFdsBtn.ToolTip = "Export FDS";

                RibbonButton sFdsSelectBtn = new RibbonButton();
                sFdsSelectBtn.Text = "Select\nFDS object";
                sFdsSelectBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                sFdsSelectBtn.LargeImage = Images.getBitmapPath(Properties.Resources.selectLarge, "selectLarge");
                sFdsSelectBtn.ExternalImage = true;
                sFdsSelectBtn.CommandParameter = "fSelect";
                sFdsSelectBtn.ButtonStyle = RibbonButtonStyle.LargeWithText;
                sFdsSelectBtn.ToolTip = "Select FDS";

                // Websocket button
                if (RibbonInit.isWebSockedInited == false)
                {
                    sWebsocketBtn.Text = "Websocket\nclosed";
                    sWebsocketBtn.LargeImage = Images.getBitmapPath(Properties.Resources.websocCloseLarge, "websocCloseLarge");
                }
                else
                {
                    sWebsocketBtn.Text = "Websocket\nopened";
                    sWebsocketBtn.LargeImage = Images.getBitmapPath(Properties.Resources.websocOpenLarge, "websocOpenLarge");
                }
                //sWebsocketBtn.Image = Images.getBitmapPath(Properties.Resources.defaultIco, "defaultIco");
                sWebsocketBtn.ExternalImage = true;
                sWebsocketBtn.ButtonStyle = RibbonButtonStyle.LargeWithText;
                sWebsocketBtn.ToolTip = "Websocket state";

                syncPanelSource.Items.Add(sCfastBtn);
                syncPanelSource.Items.Add(separator);
                syncPanelSource.Items.Add(sFdsBtn);
                syncPanelSource.Items.Add(sFdsSelectBtn);
                syncPanelSource.Items.Add(separator);
                syncPanelSource.Items.Add(sWebsocketBtn);
                #endregion

                RibbonInit.isRibbonInited = true;
                if (RibbonInit.isWebSockedInited == false)
                    syncPanel.IsEnabled = false;

            }
            catch (System.Exception)
            {
               
            }
        }
#endif

        public class Images
        {
            public static BitmapImage getBitmap(Bitmap image)
            {
                MemoryStream stream = new MemoryStream();
                image.Save(stream, ImageFormat.Png);
                BitmapImage bmp = new BitmapImage();
                bmp.BeginInit();
                bmp.StreamSource = stream;
                bmp.EndInit();

                return bmp;
            }
            public static string getBitmapPath(Bitmap image, String name)
            {
                String fullPath = Path.GetTempPath() + name +".png";
                if (!File.Exists(fullPath))
                {
                    image.Save(fullPath, ImageFormat.Png);
                }
                return fullPath;
            }
        }

    }
}