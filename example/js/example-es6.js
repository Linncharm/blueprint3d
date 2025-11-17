import $ from 'jquery';
import * as THREE from 'three';
import { Blueprint3d } from '../../src/blueprint3d';
import { floorplannerModes } from '../../src/floorplanner/floorplanner_view';

/*
 * Camera Buttons
 */

class CameraButtons {
  constructor(blueprint3d) {
    this.blueprint3d = blueprint3d;
    this.orbitControls = blueprint3d.three.controls;
    this.three = blueprint3d.three;
    this.panSpeed = 30;
    this.directions = {
      UP: 1,
      DOWN: 2,
      LEFT: 3,
      RIGHT: 4
    };
    this.init();
  }

  init() {
    $("#zoom-in").click((e) => this.zoomIn(e));
    $("#zoom-out").click((e) => this.zoomOut(e));
    $("#zoom-in").dblclick(this.preventDefault);
    $("#zoom-out").dblclick(this.preventDefault);

    $("#reset-view").click(() => this.three.centerCamera());

    $("#move-left").click(() => this.pan(this.directions.LEFT));
    $("#move-right").click(() => this.pan(this.directions.RIGHT));
    $("#move-up").click(() => this.pan(this.directions.UP));
    $("#move-down").click(() => this.pan(this.directions.DOWN));

    $("#move-left").dblclick(this.preventDefault);
    $("#move-right").dblclick(this.preventDefault);
    $("#move-up").dblclick(this.preventDefault);
    $("#move-down").dblclick(this.preventDefault);
  }

  preventDefault(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  pan(direction) {
    switch (direction) {
      case this.directions.UP:
        this.orbitControls.panXY(0, this.panSpeed);
        break;
      case this.directions.DOWN:
        this.orbitControls.panXY(0, -this.panSpeed);
        break;
      case this.directions.LEFT:
        this.orbitControls.panXY(this.panSpeed, 0);
        break;
      case this.directions.RIGHT:
        this.orbitControls.panXY(-this.panSpeed, 0);
        break;
    }
  }

  zoomIn(e) {
    e.preventDefault();
    this.orbitControls.dollyIn(1.1);
    this.orbitControls.update();
  }

  zoomOut(e) {
    e.preventDefault();
    this.orbitControls.dollyOut(1.1);
    this.orbitControls.update();
  }
}

/*
 * Context menu for selected item
 */

class ContextMenu {
  constructor(blueprint3d) {
    this.blueprint3d = blueprint3d;
    this.selectedItem = null;
    this.three = blueprint3d.three;
    this.init();
  }

  init() {
    $("#context-menu-delete").click(() => {
      if (this.selectedItem) {
        this.selectedItem.remove();
      }
    });

    this.three.itemSelectedCallbacks.add((item) => this.itemSelected(item));
    this.three.itemUnselectedCallbacks.add(() => this.itemUnselected());

    this.initResize();

    $("#fixed").click(() => {
      const checked = $("#fixed").prop('checked');
      if (this.selectedItem) {
        this.selectedItem.setFixed(checked);
      }
    });
  }

  cmToIn(cm) {
    return cm / 2.54;
  }

  inToCm(inches) {
    return inches * 2.54;
  }

  itemSelected(item) {
    this.selectedItem = item;

    $("#context-menu-name").text(item.metadata.itemName);

    $("#item-width").val(this.cmToIn(this.selectedItem.getWidth()).toFixed(0));
    $("#item-height").val(this.cmToIn(this.selectedItem.getHeight()).toFixed(0));
    $("#item-depth").val(this.cmToIn(this.selectedItem.getDepth()).toFixed(0));

    $("#context-menu").show();

    $("#fixed").prop('checked', item.fixed);
  }

  resize() {
    if (this.selectedItem) {
      this.selectedItem.resize(
        this.inToCm($("#item-height").val()),
        this.inToCm($("#item-width").val()),
        this.inToCm($("#item-depth").val())
      );
    }
  }

  initResize() {
    $("#item-height").change(() => this.resize());
    $("#item-width").change(() => this.resize());
    $("#item-depth").change(() => this.resize());
  }

  itemUnselected() {
    this.selectedItem = null;
    $("#context-menu").hide();
  }
}

/*
 * Loading modal for items
 */

class ModalEffects {
  constructor(blueprint3d) {
    this.blueprint3d = blueprint3d;
    this.itemsLoading = 0;
    this.init();
  }

  setActiveItem(active) {
    this.itemSelected = active;
    this.update();
  }

  update() {
    if (this.itemsLoading > 0) {
      $("#loading-modal").show();
    } else {
      $("#loading-modal").hide();
    }
  }

  init() {
    this.blueprint3d.model.scene.itemLoadingCallbacks.add(() => {
      this.itemsLoading += 1;
      this.update();
    });

    this.blueprint3d.model.scene.itemLoadedCallbacks.add(() => {
      this.itemsLoading -= 1;
      this.update();
    });

    this.update();
  }
}

/*
 * Side menu
 */

class SideMenu {
  constructor(blueprint3d, floorplanControls, modalEffects) {
    this.blueprint3d = blueprint3d;
    this.floorplanControls = floorplanControls;
    this.modalEffects = modalEffects;
    this.ACTIVE_CLASS = "active";

    this.tabs = {
      "FLOORPLAN": $("#floorplan_tab"),
      "SHOP": $("#items_tab"),
      "DESIGN": $("#design_tab")
    };

    this.stateChangeCallbacks = $.Callbacks();

    this.states = {
      "DEFAULT": {
        "div": $("#viewer"),
        "tab": this.tabs.DESIGN
      },
      "FLOORPLAN": {
        "div": $("#floorplanner"),
        "tab": this.tabs.FLOORPLAN
      },
      "SHOP": {
        "div": $("#add-items"),
        "tab": this.tabs.SHOP
      }
    };

    this.currentState = this.states.FLOORPLAN;

    this.init();
  }

  init() {
    for (let tab in this.tabs) {
      const elem = this.tabs[tab];
      elem.click(this.tabClicked(elem));
    }

    $("#update-floorplan").click(() => this.floorplanUpdate());

    this.initLeftMenu();

    this.blueprint3d.three.updateWindowSize();
    this.handleWindowResize();

    this.initItems();

    this.setCurrentState(this.states.DEFAULT);
  }

  floorplanUpdate() {
    this.setCurrentState(this.states.DEFAULT);
  }

  tabClicked(tab) {
    return () => {
      // Stop three from spinning
      this.blueprint3d.three.stopSpin();

      // Selected a new tab
      for (let key in this.states) {
        const state = this.states[key];
        if (state.tab === tab) {
          this.setCurrentState(state);
          break;
        }
      }
    };
  }

  setCurrentState(newState) {
    if (this.currentState === newState) {
      return;
    }

    // show the right tab as active
    if (this.currentState.tab !== newState.tab) {
      if (this.currentState.tab != null) {
        this.currentState.tab.removeClass(this.ACTIVE_CLASS);
      }
      if (newState.tab != null) {
        newState.tab.addClass(this.ACTIVE_CLASS);
      }
    }

    // set item unselected
    this.blueprint3d.three.getController().setSelectedObject(null);

    // show and hide the right divs
    this.currentState.div.hide();
    newState.div.show();

    // custom actions
    if (newState === this.states.FLOORPLAN) {
      this.floorplanControls.updateFloorplanView();
      this.floorplanControls.handleWindowResize();
    }

    if (this.currentState === this.states.FLOORPLAN) {
      this.blueprint3d.model.floorplan.update();
    }

    if (newState === this.states.DEFAULT) {
      this.blueprint3d.three.updateWindowSize();
    }

    // set new state
    this.handleWindowResize();
    this.currentState = newState;

    this.stateChangeCallbacks.fire(newState);
  }

  initLeftMenu() {
    $(window).resize(() => this.handleWindowResize());
    this.handleWindowResize();
  }

  handleWindowResize() {
    $(".sidebar").height(window.innerHeight);
    $("#add-items").height(window.innerHeight);
  }

  // TODO: this doesn't really belong here
  initItems() {
    $("#add-items").find(".add-item").mousedown((e) => {
      const $target = $(e.currentTarget);
      const modelUrl = $target.attr("model-url");
      const itemType = parseInt($target.attr("model-type"));
      const metadata = {
        itemName: $target.attr("model-name"),
        resizable: true,
        modelUrl: modelUrl,
        itemType: itemType
      };

      this.blueprint3d.model.scene.addItem(itemType, modelUrl, metadata);
      this.setCurrentState(this.states.DEFAULT);
    });
  }
}

/*
 * Change floor and wall textures
 */

class TextureSelector {
  constructor(blueprint3d, sideMenu) {
    this.blueprint3d = blueprint3d;
    this.three = blueprint3d.three;
    this.sideMenu = sideMenu;
    this.currentTarget = null;
    this.init();
  }

  initTextureSelectors() {
    $(".texture-select-thumbnail").click((e) => {
      const $target = $(e.currentTarget);
      const textureUrl = $target.attr("texture-url");
      const textureStretch = ($target.attr("texture-stretch") === "true");
      const textureScale = parseInt($target.attr("texture-scale"));

      if (this.currentTarget) {
        this.currentTarget.setTexture(textureUrl, textureStretch, textureScale);
      }

      e.preventDefault();
    });
  }

  init() {
    this.three.wallClicked.add((halfEdge) => this.wallClicked(halfEdge));
    this.three.floorClicked.add((room) => this.floorClicked(room));
    this.three.itemSelectedCallbacks.add(() => this.reset());
    this.three.nothingClicked.add(() => this.reset());
    this.sideMenu.stateChangeCallbacks.add(() => this.reset());
    this.initTextureSelectors();
  }

  wallClicked(halfEdge) {
    this.currentTarget = halfEdge;
    $("#floorTexturesDiv").hide();
    $("#wallTextures").show();
  }

  floorClicked(room) {
    this.currentTarget = room;
    $("#wallTextures").hide();
    $("#floorTexturesDiv").show();
  }

  reset() {
    $("#wallTextures").hide();
    $("#floorTexturesDiv").hide();
  }
}

/*
 * Floorplanner controls
 */

class ViewerFloorplanner {
  constructor(blueprint3d) {
    this.blueprint3d = blueprint3d;
    this.canvasWrapper = '#floorplanner';
    this.move = '#move';
    this.remove = '#delete';
    this.draw = '#draw';
    this.activeStyle = 'btn-primary disabled';
    this.floorplanner = blueprint3d.floorplanner;
    this.init();
  }

  init() {
    $(window).resize(() => this.handleWindowResize());
    this.handleWindowResize();

    // mode buttons
    this.floorplanner.modeResetCallbacksAPI.add((mode) => {
      $(this.draw).removeClass(this.activeStyle);
      $(this.remove).removeClass(this.activeStyle);
      $(this.move).removeClass(this.activeStyle);

      if (mode === floorplannerModes.MOVE) {
        $(this.move).addClass(this.activeStyle);
      } else if (mode === floorplannerModes.DRAW) {
        $(this.draw).addClass(this.activeStyle);
      } else if (mode === floorplannerModes.DELETE) {
        $(this.remove).addClass(this.activeStyle);
      }

      if (mode === floorplannerModes.DRAW) {
        $("#draw-walls-hint").show();
        this.handleWindowResize();
      } else {
        $("#draw-walls-hint").hide();
      }
    });

    $(this.move).click(() => {
      this.floorplanner.setMode(floorplannerModes.MOVE);
    });

    $(this.draw).click(() => {
      this.floorplanner.setMode(floorplannerModes.DRAW);
    });

    $(this.remove).click(() => {
      this.floorplanner.setMode(floorplannerModes.DELETE);
    });
  }

  updateFloorplanView() {
    this.floorplanner.reset();
  }

  handleWindowResize() {
    $(this.canvasWrapper).height(window.innerHeight - $(this.canvasWrapper).offset().top);
    this.floorplanner.resizeView();
  }
}

/*
 * Main controls
 */

class MainControls {
  constructor(blueprint3d) {
    this.blueprint3d = blueprint3d;
    this.init();
  }

  newDesign() {
    this.blueprint3d.model.loadSerialized('{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}');
  }

  loadDesign() {
    const files = $("#loadFile").get(0).files;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target.result;
      this.blueprint3d.model.loadSerialized(data);
    };
    reader.readAsText(files[0]);
  }

  saveDesign() {
    const data = this.blueprint3d.model.exportSerialized();
    const a = window.document.createElement('a');
    const blob = new Blob([data], { type: 'text' });
    a.href = window.URL.createObjectURL(blob);
    a.download = 'design.blueprint3d';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  init() {
    $("#new").click(() => this.newDesign());
    $("#loadFile").change(() => this.loadDesign());
    $("#saveFile").click(() => this.saveDesign());
  }
}

/*
 * Initialize!
 */

export function initBlueprint3d() {
  // main setup
  const opts = {
    floorplannerElement: 'floorplanner-canvas',
    threeElement: '#viewer',
    textureDir: "models/textures/",
    widget: false
  };
  const blueprint3d = new Blueprint3d(opts);

  const modalEffects = new ModalEffects(blueprint3d);
  const viewerFloorplanner = new ViewerFloorplanner(blueprint3d);
  const contextMenu = new ContextMenu(blueprint3d);
  const sideMenu = new SideMenu(blueprint3d, viewerFloorplanner, modalEffects);
  const textureSelector = new TextureSelector(blueprint3d, sideMenu);
  const cameraButtons = new CameraButtons(blueprint3d);
  const mainControls = new MainControls(blueprint3d);

  // This serialization format needs work
  // Load a simple rectangle room
  blueprint3d.model.loadSerialized('{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}');

  return blueprint3d;
}

// Export classes for external use if needed
export {
  CameraButtons,
  ContextMenu,
  ModalEffects,
  SideMenu,
  TextureSelector,
  ViewerFloorplanner,
  MainControls
};
