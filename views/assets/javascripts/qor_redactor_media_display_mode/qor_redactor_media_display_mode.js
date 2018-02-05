// Media display mode for redactor editor
// By Jason weng @theplant
//
$(function() {
    $.Redactor.prototype.mediadisplaymode = function() {
        return {
            langs: {
                en: {
                    mediaDisplayMode: 'Media Display Mode',
                    mediaDisplayModeButton: 'Display mode'
                }
            },
            buttonStyle: {
                position: 'absolute',
                'z-index': '5',
                top: '50%',
                left: '50%',
                'margin-top': '-11px',
                'line-height': '1',
                'background-color': 'rgba(0,0,0,.9)',
                'border-radius': '3px',
                color: '#fff',
                'font-size': '12px',
                padding: '7px 10px',
                cursor: 'pointer',
                'margin-left': '-120px'
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
                                <option value="normal">Normal</option>
                                <option value="original">Original</option>
                                <option value="fullwidth">Full Width</option>
                            </select>
                        </section>
                        <section>
                            <button id="redactor-modal-button-action">Save</button>
                            <button id="redactor-modal-button-cancel">Cancel</button>
                        </section>
                    </div></div>`;
            },
            init: function() {
                if (this.opts.type === 'pre' || this.opts.type === 'inline') {
                    return;
                }

                let button = this.button.add('mediaDisplayMode', this.lang.get('mediaDisplayMode')),
                    that = this,
                    $editor = this.core.editor();

                $editor.on('click.mediadisplaymode', this.mediadisplaymode.removeButton);
                $editor.find('img').each(function(i, img) {
                    $(img).on('click.mediadisplaymode touchstart.mediadisplaymode', that.mediadisplaymode.setImageEditter.bind(that));
                });
            },

            insertButton: function($ele) {
                $(this.mediadisplaymode.getEditterButton())
                    .css(this.mediadisplaymode.buttonStyle)
                    .appendTo($ele.closest('#redactor-image-box'))
                    .on('click.mediadisplaymode', this.mediadisplaymode.show);
            },

            removeButton: function(e) {
                if (!$(e.target).closest('#redactor-image-box').length) {
                    $('#redactor-image-displaymode').remove();
                }
            },

            setImageEditter: function(e) {
                let $image = $(e.target),
                    that = this,
                    $imageTag = $image.closest(this.opts.imageTag);

                this.mediadisplaymode.$imageTag = $imageTag;
                this.mediadisplaymode.$image = $image;
                this.mediadisplaymode.displaymode = this.mediadisplaymode.getDisplayMode($imageTag.attr('class'));

                setTimeout(function() {
                    that.mediadisplaymode.insertButton($image);
                }, 10);
            },

            getDisplayMode: function(className) {
                // console.log(className);
            },
            show: function() {
                let displaymode = this.mediadisplaymode.displaymode;

                this.modal.addTemplate('mediadisplaymode', this.mediadisplaymode.getTemplate());
                this.modal.load('mediadisplaymode', 'Media Display Mode', 600);

                let button = this.modal.getActionButton().text(this.lang.get('save'));
                button.on('click', this.mediadisplaymode.save);

                this.modal.show();
                $('#modal-media-display-mode').val(displaymode ? displaymode : 0);
                $('#redactor-image-preview').html(`<img src="${this.mediadisplaymode.$image.prop('src')}" style="max-width: 100%; opacity: 1">`);
            },
            save: function() {
                let displayMode = $('#modal-media-display-mode').val(),
                    $imageTag = this.mediadisplaymode.$imageTag;

                $imageTag.removeClass();

                if (displayMode != 0) {
                    $imageTag.addClass(`rd-display-${displayMode}`);
                }
                this.modal.close();
            }
        };
    };
});
