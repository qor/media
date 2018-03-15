// Media display mode for redactor editor
// By Jason weng @theplant
// // product.Meta(&admin.Meta{Name: "Description", Config: &admin.RichEditorConfig{Plugins: []admin.RedactorPlugin{
// 	{Name: "mediadisplaymode", Source: "/admin/assets/javascripts/qor_redactor_media_display_mode.js"},
// },
// 	Settings: map[string]interface{}{
// 		"mediaDisplayModeOptions": "Left|Right|Container Width|Full Width",
// 	},
// }})
// rendered classname:
// rd-display-left, rd-display-right, rd-display-containerwidth, rd-display-fullwidth

$.Redactor.prototype.mediadisplaymode = function() {
    return {
        langs: {
            en: {
                mediaDisplayMode: 'Media Display Mode',
                mediaDisplayModeButton: 'Display mode'
            }
        },
        getEditterButton: function() {
            return `<span id="redactor-image-displaymode" data-redactor="verified" contenteditable="false">${this.lang.get('mediaDisplayModeButton')}</span>`;
        },
        getTemplate: function() {
            return `${String()}<div class="redactor-modal-tab redactor-group">
                    <div id="redactor-image-preview" class="redactor-modal-tab-side"></div>
                    <div class="redactor-modal-tab-area" id="redactor-modal-displaymode">
                        <section>
                            <select id="modal-media-display-mode">
                                <option value="0">Please select display mode</option>
                            </select>
                        </section>
                        <section>
                            <button id="redactor-modal-button-action">Save</button>
                            <button id="redactor-modal-button-cancel">Cancel</button>
                        </section>
                    </div></div>`;
        },
        init: function() {
            let $editor = this.core.editor(),
                mediaDisplayModeOptions = this.opts.mediaDisplayModeOptions || '',
                $modes = '',
                $imgs = $editor.find('img');

            if (this.opts.type === 'pre' || this.opts.type === 'inline' || mediaDisplayModeOptions === '') {
                return;
            }

            mediaDisplayModeOptions.split(/\||,/).forEach(mode => {
                let value = mode.toLowerCase().replace(/\s/g, '');
                $modes = `${$modes}<option value="${value}">${mode}</option>`;
            });

            this.mediadisplaymode.$modes = $modes;

            $editor.on('click.redactor-mediadisplaymode touchstart.redactor-mediadisplaymode', $imgs, this.mediadisplaymode.setImageEditter.bind(this));
        },

        insertButton: function($ele) {
            let mode = this.mediadisplaymode;

            $(mode.getEditterButton())
                .prependTo($ele.closest('#redactor-image-box'))
                .on('click.redactor-mediadisplaymode', mode.show);
        },

        removeButton: function(e) {
            if (!$(e.target).closest('#redactor-image-box').length) {
                $('#redactor-image-displaymode').remove();
                $(document).off('click.redactor-mediadisplaymode');
            }
        },

        setImageEditter: function(e) {
            let $image = $(e.target),
                mediadisplaymode = this.mediadisplaymode,
                $imageTag = $image.closest(this.opts.imageTag);

            mediadisplaymode.$imageTag = $imageTag;
            mediadisplaymode.$image = $image;
            mediadisplaymode.currentDisplaymode = mediadisplaymode.getDisplayMode($imageTag.attr('class'));

            $(document).on('click.redactor-mediadisplaymode', mediadisplaymode.removeButton);

            setTimeout(function() {
                mediadisplaymode.insertButton($image);
            }, 10);
        },

        getDisplayMode: function(className) {
            let mode = className ? className.match(/rd-display-\w+/) : null;

            if (mode) {
                mode = mode[0].replace('rd-display-', '');
            }

            return mode;
        },
        show: function() {
            let currentDisplaymode = this.mediadisplaymode.currentDisplaymode;

            this.modal.addTemplate('mediadisplaymode', this.mediadisplaymode.getTemplate());
            this.modal.load('mediadisplaymode', 'Media Display Mode', 600);

            let button = this.modal.getActionButton().text(this.lang.get('save'));
            button.on('click', this.mediadisplaymode.save);

            $('#modal-media-display-mode').append(this.mediadisplaymode.$modes);

            this.modal.show();
            $('#modal-media-display-mode').val(currentDisplaymode ? currentDisplaymode : 0);
            $('#redactor-image-preview').html(`<img src="${this.mediadisplaymode.$image.prop('src')}" style="max-width: 100%; opacity: 1">`);
        },
        save: function() {
            let displayMode = $('#modal-media-display-mode').val(),
                $imageTag = this.mediadisplaymode.$imageTag;

            // remove all rd-display-* className
            $imageTag.removeClass(function(index, className) {
                return (className.match(/rd-display-\w+/g) || []).join(' ');
            });

            if (displayMode != 0) {
                $imageTag.addClass(`rd-display-${displayMode}`);
            }
            this.modal.close();
        }
    };
};
