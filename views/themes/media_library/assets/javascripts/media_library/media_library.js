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
  var EVENT_FOCUS = 'focus.' + NAMESPACE;
  var EVENT_SWITCHED = 'switched.qor.tabbar.radio';
  var EVENT_SWITCHED_TARGET = '[data-toggle="qor.tab.radio"]';
  var CLASS_MEDIA_DATA = '[name="QorResource.SelectedType"]';
  var CLASS_VIDEO = '.qor-video__link';
  var CLASS_VIDEO_TABLE = '.qor-medialibrary__video-link';
  var CLASS_UPLOAD_VIDEO_TABLE = '.qor-medialibrary__video';
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
        .on(EVENT_BLUR, CLASS_VIDEO,  this.setVideo)
        .on(EVENT_FOCUS, CLASS_VIDEO,  this.initVideo);
    },

    unbind: function () {
      // this.$element.off(EVENT_CLICK, CLASS_TAB, this.switchTab);
      $(document)
        .off(EVENT_SWITCHED, EVENT_SWITCHED_TARGET, this.resetMediaData)
        .off(EVENT_BLUR, CLASS_VIDEO,  this.setVideo)
        .off(EVENT_FOCUS, CLASS_VIDEO,  this.initVideo);
    },
    initVideo: function (event) {
      var $input = $(event.target);
      this.originalLink = $input.val();
    },

    initMedia: function () {

      $(CLASS_UPLOAD_VIDEO_TABLE).each(function () {
        var $this = $(this),
            url = $this.data().videolink,
            videoType = url && url.match(/\.mp4$|\.m4p$|\.m4v$|\.m4v$|\.mov$|\.mpeg$|\.webm$|\.avi$|\.ogg$|\.ogv$/);

        if (videoType) {
          $this.closest('tr').data('isUploadedVideo', true);
          $this.parent().addClass('qor-table--video qor-table--video-internal').html('<video width=100% height=100% controls><source src="' + url + '" type="video/' + videoType[0].replace('.', '') + '"></video>');
        }

      });

      $(CLASS_VIDEO_TABLE).each(function () {
        var $this = $(this),
            url = $this.data('videolink'),
            ID = getYoutubeID(url);

        if (ID) {
          $this.closest('tr').data('isExternalVideo', true);
          $this.parent().addClass('qor-table--video qor-table--video-external').html('<iframe width="100%" height="100%" src="//www.youtube.com/embed/' + ID + '?rel=0" frameborder="0" allowfullscreen></iframe>');
        }

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

      if (url != this.originalLink) {
        fileOption.SelectedType = 'video';
        fileOption.Video = url;
        $fileOption.val(JSON.stringify(fileOption));

        if (youtubeID) {
          $iframe.length && $iframe.remove();
          $parent.append('<iframe width="100%" height="400" src="//www.youtube.com/embed/' + getYoutubeID(url) + '?rel=0" frameborder="0" allowfullscreen></iframe>');
        }
      }

    },

    resetMediaData: function (e, element, type) {
      var $element = $(element),
          $fileOption = $element.find(CLASS_FILE_OPTION),
          $alert = $element.find('[data-tab-source="video"] .qor-fieldset__alert'),
          fileOption = JSON.parse($fileOption.val());

      fileOption.SelectedType = type;
      if (type == 'video') {
        fileOption.Video = $element.find(CLASS_VIDEO).val();
        $alert.length && $alert.remove();
      }

      $(CLASS_MEDIA_DATA).val(type);

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
        url = $render.length && $render.data().videourl;

    if ($render.length && url) {
      $render.append('<iframe width="100%" height="400" src="//www.youtube.com/embed/' + getYoutubeID(url) + '?rel=0&fs=0&modestbranding=1&disablekb=1" frameborder="0" allowfullscreen></iframe>');
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
