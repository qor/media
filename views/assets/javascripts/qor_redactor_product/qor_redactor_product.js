$R.add("plugin", "product", {
  translations: {
    en: {
      product: "Product",
      "product-link": "Product Link"
    }
  },
  init: function(app) {
    this.app = app;
    this.opts = app.opts;
    this.lang = app.lang;
    this.block = app.block;
    this.toolbar = app.toolbar;
    this.insertion = app.insertion;
  },
  start: function() {
    // create the button data
    var buttonData = {
      title: "Product",
      api: "plugin.product.open"
    };

    // create the button
    var $button = this.toolbar.addButton("product", buttonData);
    $button.setIcon('<i class="re-icon-bookmark"></i>');
  },

  open: function($button) {
    var options = {
      name: "productModal",
      title: "Product",
      handle: "insert", // optional, command which will be fired on enter pressed
      // optional object
      commands: {
        insert: { title: "Insert" },
        cancel: { title: "Cancel" }
      }
    };
    this.app.api("module.modal.build", options);
  },

  modals: {
    productModal:
      '<div class="modal-section" id="redactor-modal-product-link-insert">' +
      "<section>" +
      '<p>Note: To add a product, please go to your local ASICS e-com shop (e.g. <a href="https://www.asics.com" target="_blank">asics.com</a>) and select the product you like to add. Copy this URL and insert it here. Keep in mind that you can only add products from ASICS website, you can’t add products from any other website (e.g. amazon.com)</p>' +
      "</section>" +
      "<section>" +
      "<label>Product Link</label>" +
      '<textarea id="redactor-insert-product-link"></textarea>' +
      "</section>" +
      "</div>"
  },

  onmodal: {
    productModal: {
      opened: function($modal, $form) {
        $("#redactor-insert-product-link").focus();
      },
      insert: function($modal, $form) {
        var _this = this;
        var val = $("#redactor-insert-product-link").val();
        if ($(".front-blog-editor .qor-form").length > 0) {
          var action =
            $(".qor-form").attr("action").split("frontrunner/")[0] +
            "frontrunner/insert_product";
        } else {
          var action = "/admin/insert_product";
        }

        $.post(
          action,
          {
            link: val
          },
          function(data, status) {
            _this.insertion.insertHtml(data);
          }
        );

        this.app.api("module.modal.close");
        this.insertion.insertHtml("<p></p><p></p>");
      }
    }
  }
});
