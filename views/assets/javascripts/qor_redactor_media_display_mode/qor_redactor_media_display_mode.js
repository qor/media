// Add media library button for redactor editor
// By Jason weng @theplant
//
$(function() {
    $.Redactor.prototype.mediaDisplayMode = function() {
        return {
            langs: {
                en: {
                    mediaDisplayMode: 'Media Display Mode'
                }
            },
            getTemplate: function() {
                return `${String()}<div class="modal-section" id="redactor-modal-properties">
                        <section>
                        <label id="modal-properties-id-label">Media Display Mode</label>
                            <select id="media-display-mode">
                                <option value="normal">Normal</option>
                                <option value="original">Original</option>
                                <option value="fullwidth">Full Width</option>
                            </select>
                        </section>
                        <section>
                            <button id="redactor-modal-button-action">Save</button>
                            <button id="redactor-modal-button-cancel">Cancel</button>
                        </section>
                    </div>`;
            },
            init: function() {
                if (this.opts.type === 'pre' || this.opts.type === 'inline') {
                    return;
                }

                var button = this.button.add('imageDisplayMode', this.lang.get('mediaDisplayMode'));
                this.button.setIcon(button, '<i class="re-icon-properties"></i>');
                this.button.addCallback(button, this.mediaDisplayMode.show);
            },
            show: function() {
                this.modal.addTemplate('properties', this.mediaDisplayMode.getTemplate());
                this.modal.load('mediaDisplayMode', 'Media Display Mode', 600);

                var button = this.modal.getActionButton().text('Save');
                button.on('click', this.mediaDisplayMode.save);

                this.modal.show();
            },
            save: function() {
                // id
                if (this.opts.properties.id) {
                    var id = $('#modal-properties-id').val();
                    if (typeof id === 'undefined' || id === '') {
                        this.block.removeAttr('id', this.mediaDisplayMode.block);
                    } else {
                        this.block.replaceAttr('id', id, this.mediaDisplayMode.block);
                    }
                }

                // class
                if (this.opts.properties.classname) {
                    var classname = $('#modal-properties-class').val();
                    if (typeof classname === 'undefined' || classname === '') {
                        this.block.removeAttr('class', this.mediaDisplayMode.block);
                    } else {
                        this.block.replaceClass(classname, this.mediaDisplayMode.block);
                    }
                }

                this.modal.close();
            }
        };
    };
});
