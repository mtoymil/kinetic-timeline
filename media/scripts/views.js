(function() {
  'use strict';

  window.TimelineView = Backbone.View.extend({
    maxRulesPerBeat: 4,
    zoomScrollTreshold: 20,   // Pixels dragged before zooming starts.
    zoomScrollResolution: 40, // Pixels per 1 zoom factor

    initialize: function() {
      _.bindAll(this, 'handleMouseUp', 'rulerDragCallback');
      this.listenTo(this.model, 'resized', this.handleResize);
      this.listenTo(this.model, 'change:zoomFactor', this.handleZoom);
      this.listenTo(this.model, 'change:startPosition', this.renderOffset);

    },

    id: 'timelineContainer',    

    events: {
      'mousedown': 'handleRulerDown'
    },

    //
    // Drag Zooming
    //

    handleZoom: function() {
      this.renderStage();
    },

    handleRulerDown: function(e) {
      this.startRulerDrag(e);
      this.listenToMouseUp();
    },

    handleMouseUp: function(e) {
      this.stopRulerDrag(e);
      this.unlistenToMouseUp();
    },

    startRulerDrag: function(e) {
      $(document).bind('mousemove', this.rulerDragCallback);
      $('body').addClass('unselectable');
      this.startPos = {x: e.pageX, y: e.pageY};
    },

    stopRulerDrag: function() {
      $(document).unbind('mousemove', this.dragCallback);
      $('body').removeClass('unselectable');
    },

    listenToMouseUp: function() {
      $(document).bind('mouseup', this.handleMouseUp);
    },

    unlistenToMouseUp: function() {
      $(document).unbind('mouseup', this.handleMouseUp);
    },

    rulerDragCallback: function(e) {
      // where is the cursor now?
      var curPos = e.pageY;
      var startMetric = 'y';
      // what is the difference from where the cursor started and where it is now?
      var pixelDiff = curPos - this.startPos[startMetric];

      if (Math.abs(pixelDiff) < this.zoomScrollTreshold) {
        return;
      }

      var currentZoom = this.model.get('zoomFactor');
      var updatedZoom = currentZoom + pixelDiff/this.zoomScrollResolution;
      if (updatedZoom > this.model.get('maxZoom')) {
        updatedZoom = this.model.get('maxZoom');
      } else if (updatedZoom < this.model.get('minZoom')) {
        updatedZoom = this.model.get('minZoom');
      }
      this.model.set({'zoomFactor': updatedZoom});

    },

    //
    // Resizing
    //

    handleResize: _.debounce(function() {
      if (!this.stage) {
        return;
      }
      this.stage.setWidth(this.calculateStageWidth());
      this.stage.setHeight(this.calculateStageHeight());
    }, 10),

    calculateStageWidth: function() {
      return this.$timelineContainer.innerWidth();
    },

    calculateStageHeight: function() {
      return this.$el.height();
    },

    //
    // Stage Setup
    // 

    setUpStage: function() {
      debugger;
      this.$timelineContainer = $('#timelineContainer');
      var width = this.calculateStageWidth();
      var height = this.calculateStageHeight();
      this.stage = new Kinetic.Stage({
        container: 'timelineContainer',
        width: width,
        height: height,
        x: 0,
        y: 0,
      });

      this.rulerLayer = this.rulerLayer || new Kinetic.Layer();
      this.stage.add(this.rulerLayer);

      this.gridLayer = this.gridLayer || new Kinetic.Layer();
      this.stage.add(this.gridLayer);

      this.labelLayer = this.labelLayer || new Kinetic.Layer();
      this.stage.add(this.labelLayer);
    },

    setRulerBindings: function() {
      var self = this;
      if (!this.rulerLayer) {
        console.log('no ruler layer to bind to');
        return;
      }

      if (!this.rulerLayer.isListening()) {
        console.log('WARNING: rulerLayer not listening');
      }

      this.rulerLayer.setDraggable(true);

      // Lock ruler scrolling to allow stage to scroll for us.
      this.rulerLayer.setDragBoundFunc(function(pos) {
        return {
          x: pos.x,
          y: this.getAbsolutePosition().y
        };
      });

      // Lock grid scrolling to horizontal only
      // this.gridLayer.setDragBoundFunc(function(pos) {
      //   return {
      //     x: pos.x,
      //     y: this.getAbsolutePosition().y
      //   };
      // });

      // Catch and pass on drag events
      // this.rulerLayer.on('dragstart', function(e) {
      //   //self.gridLayer.startDrag();
      //   //self.rulerLayer.startDrag();
      // });
 
      // this.rulerLayer.on('dragend', function(e) {
      //   //self.gridLayer.stopDrag();
      //   //self.rulerLayer.stopDrag();
      // });

      this.rulerLayer.on('dragmove', function(e) {
        var rawCellWidth = self.model.get('zoomFactor') * self.model.get('baseCellWidth');
        var measureWidth = self.model.get('timeSigBeats') * rawCellWidth;
        self.model.set({'startPosition':-self.rulerLayer.getX() / measureWidth});
      });
    },

    drawBeat: function(i, rawCellWidth, cellsPerBeat) {
      var cellWidth = rawCellWidth / cellsPerBeat; // How wide a cell should be
      var offset = i * rawCellWidth;               // Where to start drawing the beat

      // Draw main beats
      var beatLine = new Kinetic.Line({
        points: [offset, 30, offset, this.stage.getHeight()],
        strokeWidth: 2,
        stroke: 'black'
      });

      this.gridLayer.add(beatLine);
      // Draw subdivisions
      for (var j=1; j<cellsPerBeat; j++) {
        var subOffset = offset + j * cellWidth;
        var subBeatLine = new Kinetic.Line({
          points: [subOffset , 30, subOffset, this.stage.getHeight()],
          strokeWidth: 1,
          stroke: 'black'
        });

        this.gridLayer.add(subBeatLine);
      }
    },

    drawRulerMeasure: function(i, rawCellWidth, cellsPerBeat) {
      var rulesPerBeat = Math.min(cellsPerBeat, this.maxRulesPerBeat);
      var offset = i * rawCellWidth * this.model.get('timeSigBeats');
      // Draw measure lines
      var measureLine = new Kinetic.Line({
        points: [offset, 0, offset, 10],
        strokeWidth: 2,
        stroke: 'black'
      });
      var measureLabel = new Kinetic.Text({
        text: i + 1,
        x: offset+3,
        y: 0,
        fontSize: 10,
        fontFamily: 'Helvetica',
        fill: 'black'
      });

      this.rulerLayer.add(measureLabel);
      this.rulerLayer.add(measureLine);

      for (var j = 1; j < this.model.get('timeSigBeats') * rulesPerBeat; j++) {
        var subOffset = offset + j * rawCellWidth/rulesPerBeat;
        var subLine = new Kinetic.Line({
          points: [subOffset + 0.5, 0 + 0.5, subOffset + 0.5, 6 + 0.5],
          strokeWidth: 1,
          stroke: 'black'
        });
        // // TODO make this labelString less shitty (like, put a width threshold and work off of that);
        var labelString = cellsPerBeat >= 16 ? i + 1 + '.' + (Math.floor(j / rulesPerBeat) + 1) + '.' + (j % rulesPerBeat + 1) : '';
        var subLabel = new Kinetic.Text({
          text: labelString,
          x: subOffset + 3,
          y: 0,
          fontSize: 10,
          fontFamily: 'Helvetica',
          fill: 'black'
        });

        this.rulerLayer.add(subLabel);
        this.rulerLayer.add(subLine);
      }
    },

    getBinarySplits: function(num, den) {
      // How many times do we need to divide the num by two to get below den?
      return Math.ceil(Math.log(num/den, 2));
    },


    renderStage: function() {
      this.renderRuler(true);
      this.renderGrid(true);
      this.renderLabel(true);
      this.renderOffset();
      this.stage.draw();
      //this.renderTracks();
    },

    renderLabel: function(skipDraw) {
      this.labelLayer.removeChildren();

      var rawCellWidth = this.model.get('zoomFactor') * this.model.get('baseCellWidth');
      var splits = this.getBinarySplits(rawCellWidth, this.model.get('maxCellWidth'));
      var cellsPerBeat = Math.pow(2, splits);
      var beats = this.model.get('measures') * this.model.get('timeSigBeats');

      // Draw ratio text
      var ratioLabel = new Kinetic.Text({
        text: '1/' + cellsPerBeat,
        x: this.$timelineContainer.width() - 50,
        y: this.$timelineContainer.height() - 50,
        fontSize: 30,
        fontFamily: 'Helvetica',
        fill: 'black'
      });

      this.labelLayer.add(ratioLabel);

      if (!skipDraw) {
        this.stage.draw();
      }
    },

    renderRuler: function(skipDraw) {
      this.rulerLayer.removeChildren();

      var rawCellWidth = this.model.get('zoomFactor') * this.model.get('baseCellWidth');
      var splits = this.getBinarySplits(rawCellWidth, this.model.get('maxCellWidth'));
      var cellsPerBeat = Math.pow(2, splits);
      var beats = this.model.get('measures') * this.model.get('timeSigBeats');

      // Draw Ruler
      for (var i = 0; i < this.model.get('measures'); i++) {
        this.drawRulerMeasure(i, rawCellWidth, cellsPerBeat);
      }
      
      var backgroundRect = new Kinetic.Rect({height:20, width: rawCellWidth * beats, fill:'none'});
      this.rulerLayer.add(backgroundRect);

      if (!skipDraw) {
        this.stage.draw();
      }
    },

    renderOffset: function() {
      var rawCellWidth = this.model.get('zoomFactor') * this.model.get('baseCellWidth');
      var measureWidth = this.model.get('timeSigBeats') * rawCellWidth;
      var x = Math.floor(measureWidth * this.model.get('startPosition'));
      this.rulerLayer.setX(-x);
      this.gridLayer.setX(-x);
      this.stage.draw();
    },

    renderGrid: function(skipDraw) {
      this.gridLayer.removeChildren();

      var rawCellWidth = this.model.get('zoomFactor') * this.model.get('baseCellWidth');
      var splits = this.getBinarySplits(rawCellWidth, this.model.get('maxCellWidth'));
      var cellsPerBeat = Math.pow(2, splits);
      var beats = this.model.get('measures') * this.model.get('timeSigBeats');

      // Draw Cells
      for (var i = 0; i < beats; i++) {
        this.drawBeat(i, rawCellWidth, cellsPerBeat);
      }

      if (!skipDraw) {
        this.stage.draw();
      }
    },

    render: function() {
      debugger;

      var self = this;
      // Canvas painting
      _.defer(function() {
        self.setUpStage();
        self.renderStage();
        self.setRulerBindings();
      });

      return this;
    }
  });
})();

