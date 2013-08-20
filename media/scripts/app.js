(function() {
  'use strict';

  // Start the demo
  var timeline = new window.Timeline();
  var view = new window.TimelineView({model: timeline}); 
  $('body').append(view.render().el);

})();
