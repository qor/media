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
  var NAMESPACE = 'qor.medialibrary';
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var CLASS_SELECT_ICON = '.qor-select__select-icon';
  var CLASS_SELECT_HINT = '.qor-selectmany__hint';
  var CLASS_PARENT = '.qor-field__mediabox';
  var CLASS_LISTS = '.qor-field__mediabox-list';
  var CLASS_ITEM = '.qor-field__mediabox-item';
  var CLASS_LISTS_DATA = '.qor-field__mediabox-data';
  var CLASS_BOTTOMSHEETS = '.qor-bottomsheets';
  var CLASS_SELECTED = 'is_selected';
  var CLASS_DELETE = 'is_deleted';
  var CLASS_CROPPER_OPTIONS = 'textarea.qor-file__options';
  var CLASS_CROPPER_DELETE = '.qor-cropper__toggle--delete';
  var CLASS_CROPPER_UNDO = '.qor-cropper__toggle--undo';


  function QorMediaBox(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorMediaBox.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorMediaBox.prototype = {
    constructor: QorMediaBox,

    init: function () {
      var $element = this.$element;
      this.SELECT_MEDIABOX_UNDO_TEMPLATE = $element.find('[name="media-box-undo-delete"]').html();
      this.bind();
    },

    bind: function () {
      $document.on(EVENT_CLICK, '[data-mediabox-url]', this.openBottomSheets.bind(this));
      this.$element
        .on(EVENT_CLICK, CLASS_CROPPER_DELETE, this.deleteSelected.bind(this))
        .on(EVENT_CLICK, CLASS_CROPPER_UNDO, this.undoDeleteSelected.bind(this))
        .on('change.qor.cropper', CLASS_CROPPER_OPTIONS, this.imageCrop.bind(this));
    },

    deleteSelected: function (e) {
      var $target = $(e.target),
          $selectFeild = $target.closest(CLASS_ITEM);

      $selectFeild.addClass(CLASS_DELETE).append(this.SELECT_MEDIABOX_UNDO_TEMPLATE).find('.qor-file__list').hide();
      this.updateMediaLibraryData($target.closest(CLASS_LISTS));

      return false;
    },

    undoDeleteSelected: function (e) {
      var $target = $(e.target),
          $selectFeild = $target.closest(CLASS_ITEM);

      $selectFeild.removeClass(CLASS_DELETE).find('.qor-file__list').show();
      this.updateMediaLibraryData($target.closest(CLASS_LISTS));
      $target.closest('.qor-fieldset__alert').remove();

      return false;
    },

    imageCrop: function (e) {
      var $parent = $(e.target).closest(CLASS_ITEM);
      this.syncImageCrop($parent);
    },

    openBottomSheets: function (e) {
      var $ele = $(e.target).closest('[data-mediabox-url]'),
          data = $ele.data(),
          $parent;

      this.BottomSheets = $body.data('qor.bottomsheets');
      this.bottomsheetsData = data;

      this.$parent = $parent = $ele.closest(CLASS_PARENT);

      this.$selectFeild = $parent.find(CLASS_LISTS);

      data.url = data.mediaboxUrl;

      // select many templates
      this.SELECT_MANY_SELECTED_ICON = $('[name="select-many-selected-icon"]').html();
      this.SELECT_MANY_HINT = $('[name="select-many-hint"]').html();

      this.SELECT_MEDIABOX_TEMPLATE = $parent.find('[name="media-box-template"]').html();
      this.SELECT_MEDIABOX_UNDO_TEMPLATE = $parent.find('[name="media-box-undo-delete"]').html();

      this.BottomSheets.open(data, this.handleSelectMany.bind(this));

    },

    initItems: function () {
      var $selectFeild = this.$selectFeild,
          $items = $selectFeild.find(CLASS_ITEM).not('.' + CLASS_DELETE),
          $trs = $(CLASS_BOTTOMSHEETS).find('tbody tr'),
          _this = this,
          $tr,
          key;

      $items.each(function() {
        key = $(this).data().primaryKey;
        $tr = $trs.filter('[data-primary-key="' + key + '"]').addClass(CLASS_SELECTED);
        _this.changeIcon($tr,true);
      });

      this.updateHint(this.getSelectedItemData());
    },

    renderSelectMany: function (data) {
      return Mustache.render(this.SELECT_MEDIABOX_TEMPLATE, data);
    },

    renderHint: function (data) {
      return Mustache.render(this.SELECT_MANY_HINT, data);
    },

    getSelectedItemData: function($ele) {
      var $selectFeild = $ele ? $ele : this.$selectFeild,
          $items = $selectFeild.find(CLASS_ITEM).not('.' + CLASS_DELETE),
          files = [],
          item;

      if ($items.size()) {
        $items.each(function() {
          item = $(this).data();

          files.push({
            ID: item.primaryKey,
            Url: item.originalUrl.replace(/.original.(\w+)$/, '.$1')
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

    updateMediaLibraryData: function ($ele) {
      var $dataInput = $ele ? $ele.find(CLASS_LISTS_DATA) : this.$selectFeild.find(CLASS_LISTS_DATA),
          data = this.getSelectedItemData($ele);

      $dataInput.val(JSON.stringify(data.files));
    },

    changeIcon: function ($ele, isAdd) {
      
      var $item = $ele.find('.qor-table--medialibrary-item'),
          $target = $item.size() ? $item : $ele.find('td:first');

      $ele.find(CLASS_SELECT_ICON).remove();

      if (isAdd) {
        $target.prepend(this.SELECT_MANY_SELECTED_ICON);
      }

    },

    syncImageCrop: function ($ele, callback) {
      var item = JSON.parse($ele.find(CLASS_CROPPER_OPTIONS).val()),
          url = $ele.data().mediaLibraryUrl,
          syncData = {};

      delete item.ID;
      delete item.Url;

      syncData.MediaOption = JSON.stringify(item);

      $.ajax({
        type: 'PUT',
        url: url,
        data: JSON.stringify(syncData),
        contentType: "application/json",
        dataType: 'json',
        success: function (data) {
          syncData.MediaOption = JSON.parse(data.MediaOption);

          if (callback && $.isFunction(callback)) {
            callback(syncData, $ele);
          }
        }
      });
    },

    removeItem: function (data) {
      var primaryKey = data.primaryKey;

      this.$selectFeild.find('[data-primary-key="' + primaryKey + '"]').remove();
      this.changeIcon(data.$clickElement);
    },

    addItem: function (data, isNewData) {
      var $template = $(this.renderSelectMany(data)),
          $input = $template.find('.qor-file__input'),
          $item = $input.closest(CLASS_ITEM),
          $hiddenItem = this.$selectFeild.find('[data-primary-key="' + data.primaryKey + '"]'),
          _this = this;

      if ($hiddenItem.size()) {
        $hiddenItem.removeClass(CLASS_DELETE).find('.qor-file__list').show();
        $hiddenItem.find('.qor-fieldset__alert').remove();
        return;
      }
      $template.appendTo(this.$selectFeild);


      // if image alread have CropOptions, replace original images as [big,middle, small] images.
      if (data.MediaOption.CropOptions) {
        this.resetImages(data, $template);
      }

      // trigger cropper function for new item
      $template.find(CLASS_CROPPER_OPTIONS).val(JSON.stringify(data.MediaOption));
      $template.trigger('enable');

      if (!data.MediaOption.CropOptions) {
        $input.data('qor.cropper').load(data.MediaOption.URL, function () {
          _this.syncImageCrop($item, _this.resetImages);
        });
      }


      if (isNewData) {
        this.BottomSheets.hide();
        return;
      }

      this.changeIcon(data.$clickElement, true);
    },

    resetImages: function (data, $template) {
        var cropOptions = data.MediaOption.CropOptions,
            keys = Object.keys(cropOptions),
            url = data.MediaOption.OriginalURL;

        if (!/original/.test(url)) {
          return;
        }

        for (var i = keys.length - 1; i >= 0; i--) {
          cropOptions[keys[i]]['URL'] = url.replace(/original/, keys[i]);
        }

        $template.find('img').each(function () {
          var $this = $(this),
              sizeName = $this.data().sizeName;

          if (sizeName && sizeName != 'original' && cropOptions[sizeName]) {
            console.log(cropOptions[sizeName]['URL']);
            $this.prop('src', cropOptions[sizeName]['URL']);
          }
        });
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
      var url = data.url || data.mediaLibraryUrl,
          _this = this,
          formatData = data;

      $.getJSON(url,function(data){
        data.MediaOption = JSON.parse(data.MediaOption);
        $.extend(formatData, data);
        _this.handleFormat(formatData, isNewData);
      });
    },

    handleFormat: function (data, isNewData) {
      var $element = data.$clickElement,
          isSelected;

      if (!data.mediaLibraryUrl) {
        data.mediaLibraryUrl = data.url;
      }

      // if (isNewData) {
      //   this.addItem(data, true);
      //   return;
      // }

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
