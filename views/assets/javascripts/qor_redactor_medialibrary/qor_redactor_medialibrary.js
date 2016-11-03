// Add media library button for redactor editor
// By Jason weng @theplant

$.Redactor.prototype.medialibrary = function() {
    return {
        reUrlYoutube: /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube\.com\S*[^\w\-\s])([\w\-]{11})(?=[^\w\-]|$)(?![?=&+%\w.-]*(?:['"][^<>]*>|<\/a>))[?=&+%\w.-]*/ig,
        reUrlVimeo: /https?:\/\/(www\.)?vimeo.com\/(\d+)($|\/)/,
        reVideo: /\.mp4$|\.m4p$|\.m4v$|\.m4v$|\.mov$|\.mpeg$|\.webm$|\.avi$|\.ogg$|\.ogv$/,
        init: function () {
            var button = this.button.add('medialibrary', 'MediaLibrary');
            this.button.addCallback(button, this.medialibrary.addMedialibrary);
            this.button.setIcon(button, '<i class="material-icons">photo_library</i>');
            $(document).on('reload.qor.bottomsheets', '.qor-bottomsheets__mediabox', this.medialibrary.initItem);
        },

        addMedialibrary: function () {
            var $element = this.$element,
                data = {'selectModal': 'mediabox', 'maxItem': '1'},
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

                $bottomsheets.qorSelectCore(options).addClass('qor-bottomsheets__mediabox');
                this.medialibrary.initItem();
        },

        initItem: function () {
            var $trs = $('.qor-bottomsheets').find('tbody tr'),
                $tr,
                $img;

            $trs.each(function () {
                $tr = $(this);
                $img = $tr.find('.qor-table--ml-slideout p img').first();
                $tr.find('.qor-table__actions').remove();
                if ($img.length) {
                    $tr.find('.qor-table--medialibrary-item').css('background-image', 'url(' + $img.prop('src') + ')');
                    $img.parent().hide();
                }
            });
        },

        selectResults: function (data) {
            this.medialibrary.handleResults(data);
        },

        submitResults: function (data) {
            this.medialibrary.handleResults(data, true);
        },

        handleResults: function (data, isNew) {
            if (isNew) {
                if (data.SelectedType == 'video_link' || JSON.parse(data.MediaOption).URL.match(this.medialibrary.reVideo)) {
                    this.medialibrary.insertVideoCode(data, true);
                } else {
                    this.medialibrary.insertImages(data, true);
                }
            } else {
                if (data.isExternalVideo || data.isUploadedVideo) {
                    this.medialibrary.insertVideoCode(data);
                } else {
                    this.medialibrary.insertImages(data);
                }
            }

            this.medialibrary.BottomSheets.hide();
        },

        insertVideoCode: function (data, isNew) {
            this.opts.mediaContainerClass = (typeof this.opts.mediaContainerClass === 'undefined') ? 'qor-video-container' : this.opts.mediaContainerClass;

            var htmlCode, $htmlCode, videoLink, mediaOption, $currentTag,
                mediaContainerClass = this.opts.mediaContainerClass,
                isVideo = data.SelectedType == 'video_link',
                iframeStart = '<iframe class="' + mediaContainerClass + '" style="width: 100%; height: 380px;" src="',
                iframeEnd = '" frameborder="0" allowfullscreen></iframe>';

            if (isNew) {
                mediaOption = JSON.parse(data.MediaOption);

                if (isVideo) {
                    videoLink = mediaOption.Video;
                    if (videoLink.match(this.medialibrary.reUrlYoutube)) {
                        htmlCode = videoLink.replace(this.medialibrary.reUrlYoutube, iframeStart + '//www.youtube.com/embed/$1' + iframeEnd);
                    }
                } else if (mediaOption.URL.match(this.medialibrary.reVideo)) {
                    htmlCode = '<video width="100%" height="380px" controls class="' + mediaContainerClass + '"><source src="' + mediaOption.URL + '"></video>';
                }

            } else {
                htmlCode = data.File || data.$clickElement.find('.qor-table--video').html();
                $htmlCode = $(htmlCode).addClass(mediaContainerClass).attr('aria-label', data.MediaOption.Description);
                htmlCode = $htmlCode[0].outerHTML;
            }

            $currentTag = this.selection.$currentTag;
            $currentTag && $currentTag.after(htmlCode);
            this.code.sync();
        },

        insertImages: function (data) {
            var src,
                $currentTag,
                $img = $('<img>'),
                $figure = $('<' + this.opts.imageTag + '>'),
                mediaOption = data.MediaOption;

            src = mediaOption.URL.replace(/image\..+\./, 'image.');

            $img.attr({
                'src': src,
                'alt': mediaOption.Description
            });
            $figure.append($img);

            $currentTag = this.selection.$currentTag;
            $currentTag && $currentTag.after($figure);
            this.image.setEditable($img);
            this.code.sync();
        }
    };
};