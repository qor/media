(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var NAMESPACE = 'qor.medialibrary.action';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_BLUR = 'blur.' + NAMESPACE;
  var EVENT_SWITCHED = 'switched.qor.tabbar.radio';
  var EVENT_SWITCHED_TARGET = '[data-toggle="qor.tab.radio"]';
  var CLASS_VIDEO = '.qor-video__link';
  var CLASS_VIDEO_TABLE = '.qor-medialibrary__video-link';
  var CLASS_FILE_OPTION = '.qor-file__options';

  function getYoutubeID(url) {
    var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[2].length == 11) {
      return match[2];
    }
  }

  function QorMedialibraryAction(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorMedialibraryAction.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorMedialibraryAction.prototype = {
    constructor: QorMedialibraryAction,

    init: function () {
      this.bind();
      this.initMedia();
    },

    bind: function () {
      $(document)
        .on(EVENT_SWITCHED, EVENT_SWITCHED_TARGET,  this.resetMediaData)
        .on(EVENT_BLUR, CLASS_VIDEO,  this.setVideo);
    },

    unbind: function () {
      // this.$element.off(EVENT_CLICK, CLASS_TAB, this.switchTab);
      $(document)
        .off(EVENT_SWITCHED, EVENT_SWITCHED_TARGET, this.resetMediaData)
        .off(EVENT_BLUR, CLASS_VIDEO,  this.setVideo);
    },

    initMedia: function () {
      // $('.qor-table--medialibrary [data-heading="Image"] a').each(function () {
      //   var $this = $(this),
      //       url = $this.prop('href');
      //   if (url.match(/\.mp4$/)) {
      //       $this.html('<video width=200 height=200><source src="' + url + '" type="video/mp4"></video>');
      //   } https://www.youtube.com/watch?v=JLXkA_EFDFc

      // });

      $(CLASS_VIDEO_TABLE).each(function () {
        var $this = $(this),
            url = $this.data('videolink'),
            ID = getYoutubeID(url);

        $this.parent().addClass('video-cover').html('<iframe width="200" height="200" src="https://www.youtube.com/embed/' + ID + '?showinfo=0&controls=0&rel=0&fs=0&modestbranding=1&disablekb=1" frameborder="0" allowfullscreen></iframe>');
      });

    },

    setVideo: function (event) {
      var $input = $(event.target),
          $parent = $input.closest('[data-tab-source]'),
          $element = $input.closest(EVENT_SWITCHED_TARGET),
          $fileOption = $element.find(CLASS_FILE_OPTION),
          fileOption = JSON.parse($fileOption.val()),
          url = $input.val(),
          $iframe = $parent.find('iframe'),
          youtubeID = getYoutubeID(url);

      fileOption.SelectedType = 'video';
      fileOption.Video = url;
      $fileOption.val(JSON.stringify(fileOption));

      if (youtubeID) {
        $iframe.length && $iframe.remove();
        $parent.append('<iframe width="100%" height="400" src="https://www.youtube.com/embed/' + getYoutubeID(url) + '?rel=0&fs=0&modestbranding=1&disablekb=1" frameborder="0" allowfullscreen></iframe>');
      }

    },

    resetMediaData: function (e, element, type) {
      var $element = $(element),
          $fileOption = $element.find(CLASS_FILE_OPTION),
          fileOption = JSON.parse($fileOption.val());

      fileOption.SelectedType = type;
      if (type == 'video') {
        fileOption.Video = $element.find(CLASS_VIDEO).val();
      } else {
        fileOption.Video = '';
      }
      $fileOption.val(JSON.stringify(fileOption));
    },

    destroy: function () {
      this.unbind();
    }
  };

  QorMedialibraryAction.DEFAULTS = {};

  $.fn.qorSliderAfterShow = $.fn.qorSliderAfterShow || {};
  $.fn.qorSliderAfterShow.renderMediaVideo = function () {
    var $render = $('[data-tab-source="video"]'),
        url = $render.data().videourl;

    if ($render.length && url) {
      $render.append('<iframe width="100%" height="400" src="https://www.youtube.com/embed/' + getYoutubeID(url) + '?rel=0&fs=0&modestbranding=1&disablekb=1" frameborder="0" allowfullscreen></iframe>');
    }
  };

  QorMedialibraryAction.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorMedialibraryAction(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '.qor-table--medialibrary';

    $(document)
      .on(EVENT_DISABLE, function (e) {
        QorMedialibraryAction.plugin.call($(selector, e.target), 'destroy');
      })
      .on(EVENT_ENABLE, function (e) {
        QorMedialibraryAction.plugin.call($(selector, e.target));
      })
      .triggerHandler(EVENT_ENABLE);
  });

  return QorMedialibraryAction;

});
