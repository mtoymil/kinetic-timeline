(function() {
  'use strict';

  window.Timeline = Backbone.Model.extend({
    defaults: {
        // Display Data
        baseCellWidth: 20,
        maxCellWidth: 30,
        zoomFactor: 1,
        maxZoom: 20,
        minZoom: 1,
        startPosition: 0, // where the timeline is scrolled to

        // Musical data
        measures: 30,
        timeSigBeats: 4,
        timeSigUnit: 4
    }
  });
})();
