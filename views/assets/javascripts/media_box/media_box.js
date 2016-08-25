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

  var $body = $('body');
  var $document = $(document);
  var Mustache = window.Mustache;
  var NAMESPACE = 'qor.selectone';
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var CLASS_CLEAR_SELECT = '.qor-selected-many__remove';
  var CLASS_SELECT_ICON = '.qor-select__select-icon';
  var CLASS_SELECT_HINT = '.qor-selectmany__hint';
  var CLASS_PARENT = '.qor-field__mediabox';
  var CLASS_LISTS = '.qor-field__mediabox-list';
  var CLASS_ITEM = '.qor-field__mediabox-item';
  var CLASS_LISTS_DATA = '.qor-field__mediabox-data';
  var CLASS_BOTTOMSHEETS = '.qor-bottomsheets';
  var CLASS_SELECTED = 'is_selected';


  function QorMediaBox(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorMediaBox.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorMediaBox.prototype = {
    constructor: QorMediaBox,

    init: function () {
      this.bind();
    },

    bind: function () {
      $document.on(EVENT_CLICK, '[data-mediabox-url]', this.openBottomSheets.bind(this));
      this.$element.on(EVENT_CLICK, CLASS_CLEAR_SELECT, this.clearSelect.bind(this));
    },

    clearSelect: function (e) {
      var $target = $(e.target),
          $selectFeild = $target.closest(CLASS_LISTS);

      $target.closest('[data-primary-key]').remove();
      this.updateMediaLibraryData($selectFeild);

      return false;
    },

    openBottomSheets: function (e) {
      var $ele = $(e.target).closest('[data-mediabox-url]'),
          data = $ele.data(),
          $parent;

      this.BottomSheets = $body.data('qor.bottomsheets');
      this.bottomsheetsData = data;

      this.$parent = $parent = $ele.closest(CLASS_PARENT);

      this.$selectFeild = $parent.find(CLASS_LISTS);
      this.$mediaLrbraryData = $parent.find(CLASS_LISTS_DATA);

      // select many templates
      this.SELECT_MANY_SELECTED_ICON = $('[name="select-many-selected-icon"]').html();
      this.SELECT_MANY_UNSELECTED_ICON = $('[name="select-many-unselected-icon"]').html();
      this.SELECT_MANY_HINT = $('[name="select-many-hint"]').html();
      this.SELECT_MEDIABOX_TEMPLATE = $('[name="media-box-template"]').html();

      data.url = data.mediaboxUrl;

      this.BottomSheets.open(data, this.handleSelectMany.bind(this));

    },

    initItems: function () {
      var $selectFeild = this.$selectFeild,
          $items = $selectFeild.find(CLASS_ITEM),
          $trs = $(CLASS_BOTTOMSHEETS).find('tbody tr'),
          _this = this,
          $tr,
          key;

      $items.each(function() {
        key = $(this).data().primaryKey;
        $tr = $trs.filter('[data-primary-key="' + key + '"]').addClass(CLASS_SELECTED);
        _this.changeIcon($tr,true);
      });
    },

    renderSelectMany: function (data) {
      return Mustache.render(this.SELECT_MEDIABOX_TEMPLATE, data);
    },

    renderHint: function (data) {
      return Mustache.render(this.SELECT_MANY_HINT, data);
    },

    getSelectedItemData: function($ele) {
      var $selectFeild = $ele ? $ele : this.$selectFeild,
          $items = $selectFeild.find(CLASS_ITEM),
          files = [],
          item;

      if ($items.size()) {
        $items.each(function() {
          item = $(this).data();

          files.push({
            ID: item.primaryKey,
            Url: item.originalUrl
          });
        });
      }
        
      return {
        files: files,
        selectedNum: files.length
      };
    },

    updateHint: function (data) {
      var template;

      $.extend(data, this.bottomsheetsData);
      template = this.renderHint(data);

      $(CLASS_SELECT_HINT).remove();
      $(CLASS_BOTTOMSHEETS).find('.qor-bottomsheets__body').prepend(template);
    },

    updateMediaLibraryData: function () {
      var $dataInput = this.$mediaLrbraryData,
          data = this.getSelectedItemData();

      $dataInput.val(JSON.stringify(data.files));
    },

    changeIcon: function ($ele, isAdd) {
      $ele.find(CLASS_SELECT_ICON).remove();

      if (isAdd) {
        $ele.find('.qor-table--medialibrary-item').prepend(this.SELECT_MANY_SELECTED_ICON);
      }

    },

    removeItem: function (data) {
      var primaryKey = data.primaryKey;

      this.$selectFeild.find('[data-primary-key="' + primaryKey + '"]').remove();
      this.changeIcon(data.$clickElement);
    },

    addItem: function (data, isNewData) {
      var $template = $(this.renderSelectMany(data));

      $template.appendTo(this.$selectFeild);

      // trigger cropper function for new item
      $template.find('.qor-file__options').val(JSON.stringify(data.File));
      $template.trigger('enable');

      if (isNewData) {
        this.BottomSheets.hide();
        return;
      }

      this.changeIcon(data.$clickElement, true);
    },

    handleSelectMany: function () {
      var $bottomsheets = $(CLASS_BOTTOMSHEETS),
          options = {
            formatOnSelect: this.formatSelectResults.bind(this),  // render selected item after click item lists
            formatOnSubmit: this.formatSubmitResults.bind(this)   // render new items after new item form submitted
          };

      $bottomsheets.qorSelectCore(options);
      this.initItems();
    },

    formatSelectResults: function (data) {
      this.formatResults(data);
    },

    formatSubmitResults: function (data) {
      this.formatResults(data, true);
    },

    formatResults: function (data, isNewData) {
      var url = '/admin/media_libraries/' + data.primaryKey,
          $element = data.$clickElement,
          _this = this,
          formatData = data;

      if (!data.File) {
        $.getJSON(url,function(data){
          data.File = JSON.parse(data.File);
          $element.data(data);
          $.extend(formatData, data);
          _this.handleFormat(formatData, isNewData);
        });
      } else {
        _this.handleFormat(formatData, isNewData);
      }

    },

    handleFormat: function (data, isNewData) {
      var $element = data.$clickElement,
          isSelected;

      if (isNewData) {
        this.addItem(data, true);
        return;
      }

      $element.toggleClass(CLASS_SELECTED);
      isSelected = $element.hasClass(CLASS_SELECTED);

      if (isSelected) {
        this.addItem(data);
      } else {
        this.removeItem(data);
      }

      this.updateHint(this.getSelectedItemData());
      this.updateMediaLibraryData();

    }

  };


  QorMediaBox.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }

        $this.data(NAMESPACE, (data = new QorMediaBox(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };

  $(function () {
    var selector = '[data-toggle="qor.mediabox"]';
    $(document).
      on(EVENT_DISABLE, function (e) {
        QorMediaBox.plugin.call($(selector, e.target), 'destroy');
      }).
      on(EVENT_ENABLE, function (e) {
        QorMediaBox.plugin.call($(selector, e.target));
      }).
      triggerHandler(EVENT_ENABLE);
  });

  return QorMediaBox;

});
