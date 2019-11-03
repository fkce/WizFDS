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
                RibbonTab Tab = new RibbonTab
                {
                    Title = "WizFDS",
                    Id = "wizfds_id2586"
                };
                ribbonControl.Tabs.Add(Tab);

                #region FDS Geometry Panel
                // FDS Geometry Panel
                RibbonPanelSource fdsGeometryPanelSource = new RibbonPanelSource
                {
                    Title = "Geometry"
                };
                RibbonPanel fdsGeometryPanel = new RibbonPanel();
                fdsGeometryPanel.Source = fdsGeometryPanelSource;
                Tab.Panels.Add(fdsGeometryPanel);

                // FDS Geometry buttons
                RibbonButton fMeshBtn = new RibbonButton
                {
                    Name = "Mesh",
                    Text = "Mesh",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.mesh),
                    LargeImage = Images.getBitmap(Properties.Resources.meshLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };
                RibbonToolTip fMeshTT = new RibbonToolTip
                {
                    Command = "FMESH",
                    Title = "MESH manual",
                    Content = "Create MESH manually using two points in drawing",
                    ExpandedContent = "Define Z min level, Z max level and than two points in drawing. Layer is changed automatically to !FDS_MESH."
                };
                fMeshBtn.ToolTip = fMeshTT;

                RibbonButton fMeshAutoBtn = new RibbonButton
                {
                    Name = "MeshAuto",
                    Text = "Mesh\nauto",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.meshAuto),
                    LargeImage = Images.getBitmap(Properties.Resources.meshAutoLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };
                RibbonToolTip fMeshAutoTT = new RibbonToolTip
                {
                    Command = "FMESHAUTO",
                    Title = "MESH auto",
                    Content = "Create multiple MESHes automatically using two points in drawing",
                    ExpandedContent = "Define horizontal and vertical mesh numbers. Z level is automatically fitted to FDS geometry. Layer is changed automatically to !FDS_MESH."
                };
                fMeshAutoBtn.ToolTip = fMeshAutoTT;

                RibbonButton fOpenBtn = new RibbonButton
                {
                    Name = "Open",
                    Text = "Open",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.open),
                    LargeImage = Images.getBitmap(Properties.Resources.openLarge),
                    //fOpenBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                    Size = RibbonItemSize.Standard,
                    CommandHandler = new RibbonCommandHandler()
                };
                RibbonToolTip fOpenTT = new RibbonToolTip
                {
                    Command = "FOPEN",
                    Title = "OPEN",
                    Content = "Create OPEN boundary in x, y, z direction",
                    ExpandedContent = "Choose manually mesh which and then sides to open. Layer is changed automatically to !FDS_MESH[open]."
                };
                fOpenBtn.ToolTip = fOpenTT;

                RibbonButton fOpenVisualBtn = new RibbonButton
                {
                    Name = "OpenVisual",
                    Text = "Visual open",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.open),
                    LargeImage = Images.getBitmap(Properties.Resources.openLarge),
                    //fOpenVisualBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                    Size = RibbonItemSize.Standard,
                    CommandHandler = new RibbonCommandHandler()
                };
                RibbonToolTip fOpenVisualTT = new RibbonToolTip
                {
                    Command = "FOPEN",
                    Title = "OPEN visual",
                    Content = "Create OPEN boundary in visual mode",
                    ExpandedContent = "Choose visually sides of mesh to open. Layer is changed automatically to !FDS_MESH[open]."
                };
                fOpenVisualBtn.ToolTip = fOpenVisualTT;

                RibbonButton fOpenManualBtn = new RibbonButton
                {
                    Name = "OpenManual",
                    Text = "Manual open",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.openManual),
                    LargeImage = Images.getBitmap(Properties.Resources.openManualLarge),
                    //fOpenManualBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                    Size = RibbonItemSize.Standard,
                    CommandHandler = new RibbonCommandHandler()
                };
                RibbonToolTip fOpenManualTT = new RibbonToolTip
                {
                    Command = "FOPEN",
                    Title = "OPEN manual",
                    Content = "Create OPEN vents",
                    ExpandedContent = "Create OPEN boundary on the part of the MESH side. Layer is changed automatically to !FDS_MESH[open]."
                };
                fOpenManualBtn.ToolTip = fOpenManualTT;

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

                RibbonButton fObstBtn = new RibbonButton
                {
                    Name = "Obst",
                    Text = "Obst",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.obstLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };
                RibbonToolTip fObstTT = new RibbonToolTip
                {
                    Command = "FOBST",
                    Title = "OBST",
                    Content = "Create OBST",
                    //ExpandedContent = "Create OPEN boundary on the part of the MESH side. Layer is changed automatically to !FDS_MESH[open]."
                };
                fObstBtn.ToolTip = fObstTT;

                RibbonButton fHoleBtn = new RibbonButton
                {
                    Name = "Hole",
                    Text = "Hole",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.holeLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };
                RibbonToolTip fHoleTT = new RibbonToolTip
                {
                    Command = "FHOLE",
                    Title = "HOLE",
                    Content = "Create OBST",
                    //ExpandedContent = "Create OPEN boundary on the part of the MESH side. Layer is changed automatically to !FDS_MESH[open]."
                };
                fHoleBtn.ToolTip = fHoleTT;

                RibbonButton fWallBtn = new RibbonButton
                {
                    Name = "Wall",
                    Text = "Wall",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.wall),
                    LargeImage = Images.getBitmap(Properties.Resources.wallLarge),
                    CommandHandler = new RibbonCommandHandler()
                };

                RibbonButton fCeilingBtn = new RibbonButton
                {
                    Name = "Ceiling",
                    Text = "Ceiling",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.ceiling),
                    LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge),
                    CommandHandler = new RibbonCommandHandler()
                };

                RibbonButton fCWallBtn = new RibbonButton
                {
                    Name = "CWall",
                    Text = "CWall",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.cwall),
                    LargeImage = Images.getBitmap(Properties.Resources.wallLarge),
                    CommandHandler = new RibbonCommandHandler()
                };

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

                RibbonButton fGeomBtn = new RibbonButton
                {
                    Name = "Geom",
                    Text = "Complex\nauto",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.geom),
                    LargeImage = Images.getBitmap(Properties.Resources.geomLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };

                RibbonButton fGeomManBtn = new RibbonButton
                {
                    Name = "GeomMan",
                    Text = "Complex\nmanual",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.geomMan),
                    LargeImage = Images.getBitmap(Properties.Resources.geomManLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };

                fdsGeometryPanelSource.Items.Add(new RibbonSeparator());
                fdsGeometryPanelSource.Items.Add(fGeomBtn);
                fdsGeometryPanelSource.Items.Add(fGeomManBtn);

                #endregion

                #region FDS Ventilation Panel
                // FDS Ventilation Panel
                Autodesk.Windows.RibbonPanelSource fdsVentilationPanelSource = new RibbonPanelSource
                {
                    Title = "Ventilation"
                };
                RibbonPanel fdsVentilationPanel = new RibbonPanel();
                fdsVentilationPanel.Source = fdsVentilationPanelSource;
                Tab.Panels.Add(fdsVentilationPanel);

                RibbonButton fVentBtn = new RibbonButton
                {
                    Name = "Vent",
                    Text = "Vent",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.ventLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };

                RibbonButton fJetfanBtn = new RibbonButton
                {
                    Name = "Jetfan",
                    Text = "Jetfan",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.jetfanLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };

                fdsVentilationPanelSource.Items.Add(fVentBtn);
                fdsVentilationPanelSource.Items.Add(fJetfanBtn);
                #endregion

                #region FDS Specie Panel
                // FDS Specie Panel
                Autodesk.Windows.RibbonPanelSource fdsSpeciePanelSource = new RibbonPanelSource
                {
                    Title = "Specie"
                };
                RibbonPanel fdsSpeciePanel = new RibbonPanel();
                fdsSpeciePanel.Source = fdsSpeciePanelSource;
                Tab.Panels.Add(fdsSpeciePanel);

                RibbonButton fSpecBtn = new RibbonButton
                {
                    Name = "Specie",
                    Text = "Specie",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.ventLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };

                fdsSpeciePanelSource.Items.Add(fSpecBtn);
                #endregion

                #region FDS Fire Panel
                // FDS Fire Panel
                Autodesk.Windows.RibbonPanelSource fdsFirePanelSource = new RibbonPanelSource
                {
                    Title = "Fire"
                };
                RibbonPanel fdsFirePanel = new RibbonPanel();
                fdsFirePanel.Source = fdsFirePanelSource;
                Tab.Panels.Add(fdsFirePanel);

                RibbonButton fFireBtn = new RibbonButton
                {
                    Name = "Fire",
                    Text = "Fire",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.fireLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };

                fdsFirePanelSource.Items.Add(fFireBtn);
                #endregion

                #region FDS Output Panel
                // FDS Output Panel
                Autodesk.Windows.RibbonPanelSource fdsOutputPanelSource = new RibbonPanelSource
                {
                    Title = "Output"
                };
                RibbonPanel fdsOutputPanel = new RibbonPanel();
                fdsOutputPanel.Source = fdsOutputPanelSource;
                Tab.Panels.Add(fdsOutputPanel);

                RibbonButton fDevcBtn = new RibbonButton
                {
                    Name = "Devc",
                    Text = "Devc",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.deviceLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };

                RibbonButton fSlcfBtn = new RibbonButton
                {
                    Name = "Slcf",
                    Text = "Slcf",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.sliceLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };

                fdsOutputPanelSource.Items.Add(fDevcBtn);
                fdsOutputPanelSource.Items.Add(fSlcfBtn);
                #endregion

                #region Layers Panel
                // Layers Panel
                Autodesk.Windows.RibbonPanelSource layersPanelSource = new RibbonPanelSource
                {
                    Title = "Layers"
                };
                RibbonPanel layersPanel = new RibbonPanel();
                layersPanel.Source = layersPanelSource;
                Tab.Panels.Add(layersPanel);

                //CreateBasicLayers
                RibbonButton lCreateBasicBtn = new RibbonButton
                {
                    Name = "CreateBasic",
                    Text = "Create\nbasic",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.basicLayers),
                    LargeImage = Images.getBitmap(Properties.Resources.basicLayersLarge),
                    Size = RibbonItemSize.Large,
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    CommandHandler = new RibbonCommandHandler()
                };

                //CreateFdsLayer
                RibbonButton lCreateFdsBtn = new RibbonButton
                {
                    Name = "CreateFds",
                    Text = "Create\nFDS",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.layersLarge),
                    Size = RibbonItemSize.Large,
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    CommandHandler = new RibbonCommandHandler()
                };

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
                RibbonButton lCreateLevelBtn = new RibbonButton
                {
                    Name = "CreateFdsLevel",
                    Text = "Add level",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.levelAdd),
                    LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge),
                    Size = RibbonItemSize.Standard,
                    //lCreateLevelBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                    CommandHandler = new RibbonCommandHandler()
                };

                //HideForLevel
                RibbonButton lHideLevelBtn = new RibbonButton
                {
                    Name = "HideLevel",
                    Text = "Hide level",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.levelHide),
                    LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge),
                    Size = RibbonItemSize.Standard,
                    CommandHandler = new RibbonCommandHandler()
                };

                //ShowForLevel
                RibbonButton lShowLevelBtn = new RibbonButton
                {
                    Name = "ShowLevel",
                    Text = "Show level",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.levelShow),
                    LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge),
                    Size = RibbonItemSize.Standard,
                    CommandHandler = new RibbonCommandHandler()
                };

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

                #region Sync Panel

                // Sync Panel
                Autodesk.Windows.RibbonPanelSource syncPanelSource = new RibbonPanelSource
                {
                    Title = "Sync"
                };
                syncPanel.Source = syncPanelSource;
                Tab.Panels.Add(syncPanel);

                RibbonButton sFdsBtn = new RibbonButton
                {
                    Name = "sFDS",
                    Text = "Export\nFDS",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.exportLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };

                RibbonButton sFdsSelectBtn = new RibbonButton
                {
                    Name = "sFDSSelect",
                    Text = "Select\nFDS object",
                    ShowText = true,
                    ShowImage = true,
                    Image = Images.getBitmap(Properties.Resources.defaultIco),
                    LargeImage = Images.getBitmap(Properties.Resources.selectLarge),
                    Orientation = System.Windows.Controls.Orientation.Vertical,
                    Size = RibbonItemSize.Large,
                    CommandHandler = new RibbonCommandHandler()
                };

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

                syncPanelSource.Items.Add(sFdsBtn);
                syncPanelSource.Items.Add(sFdsSelectBtn);
                syncPanelSource.Items.Add(new RibbonSeparator());
                syncPanelSource.Items.Add(sWebsocketBtn);
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