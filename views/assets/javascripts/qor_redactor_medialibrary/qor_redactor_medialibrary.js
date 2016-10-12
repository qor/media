// Add media library button for redactor editor
// By Jason weng @theplant

$.Redactor.prototype.medialibrary = function() {
    return {
        init: function () {
            var button = this.button.add('medialibrary', 'MediaLibrary');
            this.button.addCallback(button, this.medialibrary.addMedialibrary);
            this.button.setIcon(button, '<i class="material-icons">photo_library</i>');
        },

        addMedialibrary: function () {
            var $element = this.$element,
                data = {},
                mediaboxUrl = $element.data().redactorSettings.medialibraryUrl,
                BottomSheets;

            this.medialibrary.BottomSheets = BottomSheets = $('body').data('qor.bottomsheets');
            data.url = mediaboxUrl;

            BottomSheets.open(data, this.medialibrary.handleMediaLibrary);
        },

        handleMediaLibrary: function () {
            var $bottomsheets = $('.qor-bottomsheets'),
                options = {
                    onSelect: this.medialibrary.selectResults,  // render selected item after click item lists
                    onSubmit: this.medialibrary.submitResults   // render new items after new item form submitted
                };

                $bottomsheets.qorSelectCore(options).addClass('qor-bottomsheets__mediabox').find('.qor-button--new').data('ingore-submit', true);
        },

        selectResults: function (e, data) {
            this.medialibrary.handleResults(e, data);
        },

        submitResults: function (e, data) {
            this.medialibrary.handleResults(e, data, true);
        },

        handleResults: function (e, data, isNew) {
            var json = {},
                src;

            src = isNew ? JSON.parse(data.MediaOption).URL : $(data.Image).prop('src');
            src = src.replace(/image\..+\./, 'image.');

            json.url = src;
            json.fromMedialibrary = true;

            // insert: function(json, direct, e)
            this.image.insert(json, false, e);
            this.medialibrary.BottomSheets.hide();
        }


    };
};