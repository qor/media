(function($R) {
  $R.add("plugin", "table", {
    translations: {
      en: {
        table: "Table",
        "insert-table": "Insert table",
        "insert-row-above": "Insert row above",
        "insert-row-below": "Insert row below",
        "insert-column-left": "Insert column left",
        "insert-column-right": "Insert column right",
        "add-head": "Add head",
        "delete-head": "Delete head",
        "delete-column": "Delete column",
        "delete-row": "Delete row",
        "delete-table": "Delete table",
        "set-table-theme": "Set table theme",
        "merge-cell": "Merge cell"
      }
    },
    modals: {
      setTableThemeModal: `<form action=""></form>`
    },
    onmodal: {
      setTableThemeModal: {
        open: function($modal, $form) {
          // add customize className for table
          if (
            !this.opts.setTableThemeModal &&
            typeof this.opts.tableClassNames != "undefined"
          ) {
            var tableClassNames = this.opts.tableClassNames.split(";");
            var optionsHtml = tableClassNames.reduce(function(memo, data) {
              const classArr = data.split(",");
              if (classArr && classArr.length === 2) {
                const classTitle = classArr[1];
                const classValue = classArr[0];
                return (
                  memo + `<option value="${classValue}">${classTitle}</option>`
                );
              }
            }, "");
            optionsHtml = `<option value="">No Theme</option>` + optionsHtml;

            this.opts.setTableThemeModal = `<div class="form-item"><label>Select Theme</label><select name="theme">${optionsHtml}
            </select></div>`;
          }
          $form.append(this.opts.setTableThemeModal);
        },
        save: function($modal, $form) {
          var data = $form.getData();
          if (data && data.theme != undefined) {
            this.app.api("plugin.table.setTableTheme", {
              classValue: data.theme
            });
          }
        }
      }
    },

    init: function(app) {
      this.app = app;
      this.lang = app.lang;
      this.opts = app.opts;
      this.caret = app.caret;
      this.editor = app.editor;
      this.toolbar = app.toolbar;
      this.component = app.component;
      this.inspector = app.inspector;
      this.insertion = app.insertion;
      this.selection = app.selection;
      this.block = app.block;
    },
    // messages
    ondropdown: {
      table: {
        observe: function(dropdown) {
          this._observeDropdown(dropdown);
        }
      }
    },
    onbottomclick: function() {
      this.insertion.insertToEnd(this.editor.getLastNode(), "table");
    },

    // public
    start: function() {
      var dropdown = {
        observe: "table",
        "insert-table": {
          title: this.lang.get("insert-table"),
          api: "plugin.table.insert"
        },
        "insert-row-above": {
          title: this.lang.get("insert-row-above"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.addRowAbove"
        },
        "insert-row-below": {
          title: this.lang.get("insert-row-below"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.addRowBelow"
        },
        "insert-column-left": {
          title: this.lang.get("insert-column-left"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.addColumnLeft"
        },
        "insert-column-right": {
          title: this.lang.get("insert-column-right"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.addColumnRight"
        },
        "add-head": {
          title: this.lang.get("add-head"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.addHead"
        },
        "delete-head": {
          title: this.lang.get("delete-head"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.deleteHead"
        },
        "delete-column": {
          title: this.lang.get("delete-column"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.deleteColumn"
        },
        "delete-row": {
          title: this.lang.get("delete-row"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.deleteRow"
        },

        "delete-table": {
          title: this.lang.get("delete-table"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.deleteTable"
        },
        "merge-cell": {
          title: this.lang.get("merge-cell"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.mergeCell"
        }
      };

      this.opts.tableClassNames =
        "table-asics-blue,ASICS Blue;table-asics-light-blue,ASICS Light Blue;table-asics-light-green,ASICS Light Green;table-asics-coral,ASICS Carol";
      if (typeof this.opts.tableClassNames != "undefined") {
        dropdown["set-table-theme"] = {
          title: this.lang.get("set-table-theme"),
          classname: "redactor-table-item-observable",
          api: "plugin.table.setTableThemeModal"
        };
      }

      var obj = {
        title: this.lang.get("table")
      };

      var $button = this.toolbar.addButtonBefore("link", "table", obj);
      $button.setIcon('<i class="re-icon-table"></i>');
      $button.setDropdown(dropdown);

      var isMouseUp = false,
        isMouseDown = false;
      var startElement, $tdParent;
      var $$editor = $(this.app.editor.$editor.nodes[0]);
      $$editor.on("focus", "td,th", function() {
        $$editor
          .find("td[data-active],th[data-active]")
          .removeAttr("data-active");
        $(this).attr("data-active", "");

        startElement = this;
        $tdParent = $(this).closest("thead,tbody");
      });

      $("body").on("click", function(e) {
        var isInTable = $(e.target).closest("table").length > 0;
        var isInToolbar = $(e.target).closest(".redactor-toolbar").length > 0;
        var isInDropDown = $(e.target).closest(".redactor-dropdown").length > 0;
        if (!isInTable && !isInToolbar && !isInDropDown) {
          $$editor
            .find("td[data-active],th[data-active]")
            .removeAttr("data-active");
        }
      });

      $$editor.on("mousedown", "td, th", function() {
        isMouseUp = false;
        isMouseDown = true;
        var $currentTdParent = $(this).closest("thead,tbody");
        _this.calcTableElementPosition($currentTdParent);
      });

      $$editor.on("mouseup", "td, th", function() {
        isMouseUp = true;
        isMouseDown = false;
        console.log("show context bar");
      });

      var _this = this;

      $$editor.on("mouseenter", "td, th", function() {
        var endElement = this;
        var $currentTdParent = $(this).closest("thead,tbody");
        if (isMouseDown && $currentTdParent[0] === $tdParent[0]) {
          $currentTdParent
            .find("td[data-active],th[data-active]")
            .removeAttr("data-active");
          _this.calcCellMergeRange(startElement, endElement);
          _this.renderCellMergeRange(_this.finalRange);
        }
      });
    },

    calcCellMergeRange: function(startElement, endElement) {
      var _this = this;
      var startPoint = {
        firstPoint: JSON.parse(startElement.firstPoint),
        lastPoint: JSON.parse(startElement.lastPoint)
      };
      var endPoint = {
        firstPoint: JSON.parse(endElement.firstPoint),
        lastPoint: JSON.parse(endElement.lastPoint)
      };

      var minRow = Math.min(
          startPoint.firstPoint.row,
          startPoint.lastPoint.row,
          endPoint.firstPoint.row,
          endPoint.lastPoint.row
        ),
        minCol = Math.min(
          startPoint.firstPoint.col,
          startPoint.lastPoint.col,
          endPoint.firstPoint.col,
          endPoint.lastPoint.col
        ),
        maxRow = Math.max(
          startPoint.firstPoint.row,
          startPoint.lastPoint.row,
          endPoint.firstPoint.row,
          endPoint.lastPoint.row
        ),
        maxCol = Math.max(
          startPoint.firstPoint.col,
          startPoint.lastPoint.col,
          endPoint.firstPoint.col,
          endPoint.lastPoint.col
        );

      function loop(minRow, minCol, maxRow, maxCol) {
        var newMinRow = minRow;
        var newMinCol = minCol;
        var newMaxRow = maxRow;
        var newMaxCol = maxCol;
        for (var x = minRow; x <= maxRow; x++) {
          for (var y = minCol; y <= maxCol; y++) {
            var currentElement = _this.tableElements[x][y];
            var currentStartPoint = JSON.parse(currentElement.firstPoint);
            var currentEndPoint = JSON.parse(currentElement.lastPoint);

            newMinRow = Math.min(
              parseInt(currentStartPoint.row),
              parseInt(currentEndPoint.row),
              newMinRow
            );
            newMinCol = Math.min(
              currentStartPoint.col,
              currentEndPoint.col,
              newMinCol
            );
            newMaxRow = Math.max(
              currentStartPoint.row,
              currentEndPoint.row,
              newMaxRow
            );
            newMaxCol = Math.max(
              currentStartPoint.col,
              currentEndPoint.col,
              newMaxCol
            );
          }
        }

        if (
          newMinRow == minRow &&
          newMinCol == minCol &&
          newMaxRow == maxRow &&
          newMaxCol == maxCol
        ) {
          return {
            minRow,
            minCol,
            maxRow,
            maxCol
          };
        } else {
          return loop(newMinRow, newMinCol, newMaxRow, newMaxCol);
        }
      }

      _this.finalRange = loop(minRow, minCol, maxRow, maxCol);
      _this.selectedRowRange = maxRow - minRow + 1;
      _this.selectedColRange = maxCol - minCol + 1;
    },

    renderCellMergeRange: function({ minRow, minCol, maxRow, maxCol }) {
      var _this = this;

      for (var x = minRow; x <= maxRow; x++) {
        for (var y = minCol; y <= maxCol; y++) {
          var currentElement = _this.tableElements[x][y];
          $(currentElement).attr("data-active", "");
        }
      }
    },

    savePosition: function(element, point) {
      if (!element.lastPoint) {
        element.firstPoint = point;
      }
      element.lastPoint = point;
    },

    calcTableElementPosition: function($parent) {
      var _this = this;
      this.tableElements = [];

      function fill(element, indexTr, tdIndex, rowSpanLength, colSpanLength) {
        var maxIndexTr = parseInt(indexTr) + parseInt(rowSpanLength);
        var maxTdIndex = parseInt(colSpanLength) + parseInt(tdIndex);

        for (var i = indexTr; i < maxIndexTr; i++) {
          for (var j = tdIndex; j < maxTdIndex; j++) {
            _this.tableElements[i] = _this.tableElements[i] || [];
            _this.tableElements[i][j] = element;
          }
        }
      }

      $parent.find("tr").each(function(indexTr) {
        var $currentRow = $(this);
        _this.tableElements[indexTr] = _this.tableElements[indexTr] || [];

        var tdIndex = 0;
        $currentRow.find("td,th").each(function() {
          var rowSpanLength = $(this).attr("rowspan") || 1;
          var colSpanLength = $(this).attr("colspan") || 1;

          if (!_this.tableElements[indexTr][tdIndex]) {
            if (rowSpanLength > 1 || colSpanLength > 1) {
              fill(this, indexTr, tdIndex, rowSpanLength, colSpanLength);
            } else {
              _this.tableElements[indexTr][tdIndex] = this;
            }
          } else {
            tdIndex = _this.tableElements[indexTr].length;
            _this.tableElements[indexTr].push(this);
            if (rowSpanLength > 1 || colSpanLength > 1) {
              fill(this, indexTr, tdIndex, rowSpanLength, colSpanLength);
            }
          }
          tdIndex++;
        });

        _this.tableElements.forEach(function(tableTr, row) {
          tableTr.forEach(function(tableTd, col) {
            _this.savePosition(tableTd, JSON.stringify({ row, col }));
            // debug code
            // tableTd.innerHTML = `${tableTd.firstPoint},${tableTd.lastPoint}`;
          });
        });
      });
    },
    insert: function() {
      var rows = 2;
      var columns = 3;
      var $component = this.component.create("table");
      $component.$element.addClass("table-asics-richeditor");

      for (var i = 0; i < rows; i++) {
        $component.addRow(columns);
      }

      $component = this.insertion.insertHtml($component);
      this.caret.setStart($component);
    },
    addRowAbove: function() {
      var $component = this._getComponent();
      if ($component) {
        var current = this.selection.getCurrent();
        var $row = $component.addRowTo(current, "before");

        this.caret.setStart($row);
      }
    },
    addRowBelow: function() {
      var $component = this._getComponent();
      if ($component) {
        var current = this.selection.getCurrent();
        var $row = $component.addRowTo(current, "after");

        this.caret.setStart($row);
      }
    },
    addColumnLeft: function() {
      var $component = this._getComponent();
      if ($component) {
        var current = this.selection.getCurrent();

        this.selection.save();
        $component.addColumnTo(current, "left");
        this.selection.restore();
      }
    },
    addColumnRight: function() {
      var $component = this._getComponent();
      if ($component) {
        var current = this.selection.getCurrent();

        this.selection.save();
        $component.addColumnTo(current, "right");
        this.selection.restore();
      }
    },
    addHead: function() {
      var $component = this._getComponent();
      if ($component) {
        this.selection.save();
        $component.addHead();
        this.selection.restore();
      }
    },
    deleteHead: function() {
      var $component = this._getComponent();
      if ($component) {
        var current = this.selection.getCurrent();
        var $head = $R.dom(current).closest("thead");
        if ($head.length !== 0) {
          $component.removeHead();
          this.caret.setStart($component);
        } else {
          this.selection.save();
          $component.removeHead();
          this.selection.restore();
        }
      }
    },
    deleteColumn: function() {
      var $component = this._getComponent();
      if ($component) {
        var current = this.selection.getCurrent();

        var $currentCell = $R.dom(current).closest("td, th");
        var nextCell = $currentCell.nextElement().get();
        var prevCell = $currentCell.prevElement().get();

        $component.removeColumn(current);

        if (nextCell) this.caret.setStart(nextCell);
        else if (prevCell) this.caret.setEnd(prevCell);
        else this.deleteTable();
      }
    },
    deleteRow: function() {
      var $component = this._getComponent();
      if ($component) {
        var current = this.selection.getCurrent();

        var $currentRow = $R.dom(current).closest("tr");
        var nextRow = $currentRow.nextElement().get();
        var prevRow = $currentRow.prevElement().get();

        $component.removeRow(current);

        if (nextRow) this.caret.setStart(nextRow);
        else if (prevRow) this.caret.setEnd(prevRow);
        else this.deleteTable();
      }
    },
    mergeCell: function() {
      var _this = this;
      var table = this._getTable();
      if (table) {
        var $component = this._getComponent();
        if ($component) {
          var current = this.selection.getCurrent();

          var $tdParent = $(current).closest("tbody,thead");

          var { minRow, minCol, maxRow, maxCol } = _this.finalRange;
          var $firstCell = $(_this.tableElements[minRow][minCol]);
          var rowSpanLength = $firstCell.attr("rowspan") || 1;
          var colSpanLength = $firstCell.attr("colspan") || 1;

          rowSpanLength = Math.max(rowSpanLength - 1, _this.selectedRowRange);
          $firstCell.attr("rowspan", rowSpanLength);
          colSpanLength = Math.max(colSpanLength - 1, _this.selectedColRange);
          $firstCell.attr("colspan", colSpanLength);

          for (var x = minRow; x <= maxRow; x++) {
            for (var y = minCol; y <= maxCol; y++) {
              var currentElement = _this.tableElements[x][y];
              if (currentElement != $firstCell[0]) {
                $(currentElement).remove();
              }
              _this.tableElements[x][y] = $firstCell[0];
              _this.savePosition($tdParent[0], JSON.stringify({ x, y }));
            }
          }
        }
      }
    },
    deleteTable: function() {
      var table = this._getTable();
      if (table) {
        this.component.remove(table);
      }
    },

    clearTableTheme: function() {
      var table = this._getTable();
      if (table) {
        $R
          .dom(table)
          .removeClass(
            this.opts.tableClassNames.toString().replace(/[,;]/g, " ")
          );
      }
    },

    setTableTheme: function(argus) {
      var table = this._getTable();
      if (table) {
        this.clearTableTheme();
        $R.dom(table).addClass(argus.classValue);
        this.app.api("module.modal.close");
      }
    },

    setTableThemeModal: function() {
      var options = {
        name: "setTableThemeModal",
        title: "Set table theme",
        handle: "save", // optional, command which will be fired on enter pressed
        // optional object
        commands: {
          save: { title: "Save" },
          cancel: { title: "Cancel" }
        }
      };

      this.app.api("module.modal.build", options);
    },

    // private
    _getTable: function() {
      var current = this.selection.getCurrent();
      var data = this.inspector.parse(current);
      if (data.isTable()) {
        return data.getTable();
      }
    },
    _getComponent: function() {
      var current = this.selection.getCurrent();
      var data = this.inspector.parse(current);
      if (data.isTable()) {
        var table = data.getTable();

        return this.component.create("table", table);
      }
    },
    _observeDropdown: function(dropdown) {
      var table = this._getTable();
      var items = dropdown.getItemsByClass("redactor-table-item-observable");
      var tableItem = dropdown.getItem("insert-table");
      if (table) {
        this._observeItems(items, "enable");
        tableItem.disable();
      } else {
        this._observeItems(items, "disable");
        tableItem.enable();
      }
    },
    _observeItems: function(items, type) {
      for (var i = 0; i < items.length; i++) {
        items[i][type]();
      }
    }
  });
})(Redactor);
(function($R) {
  $R.add("class", "table.component", {
    mixins: ["dom", "component"],
    init: function(app, el) {
      this.app = app;

      // init
      return el && el.cmnt !== undefined ? el : this._init(el);
    },

    // public
    addHead: function() {
      this.removeHead();

      var columns = this.$element.find("tr").first().children("td, th").length;
      var $head = $R.dom("<thead>");
      var $row = this._buildRow(columns, "<th>");

      $head.append($row);
      this.$element.prepend($head);
    },
    addRow: function(columns) {
      var $row = this._buildRow(columns);
      this.$element.append($row);

      return $row;
    },
    addRowTo: function(current, type) {
      return this._addRowTo(current, type);
    },
    addColumnTo: function(current, type) {
      var $current = $R.dom(current);
      var $currentRow = $current.closest("tr");
      var $currentCell = $current.closest("td, th");

      var index = 0;
      $currentRow.find("td, th").each(function(node, i) {
        if (node === $currentCell.get()) index = i;
      });

      this.$element.find("tr").each(function(node) {
        var $node = $R.dom(node);
        var origCell = $node.find("td, th").get(index);
        var $origCell = $R.dom(origCell);

        var $td = $origCell.clone();
        $td.html("");

        if (type === "right") $origCell.after($td);
        else $origCell.before($td);
      });
    },
    removeHead: function() {
      var $head = this.$element.find("thead");
      if ($head.length !== 0) $head.remove();
    },
    removeRow: function(current) {
      var $current = $R.dom(current);
      var $currentRow = $current.closest("tr");

      $currentRow.remove();
    },
    removeColumn: function(current) {
      var $current = $R.dom(current);
      var $currentRow = $current.closest("tr");
      var $currentCell = $current.closest("td, th");

      var index = 0;
      $currentRow.find("td, th").each(function(node, i) {
        if (node === $currentCell.get()) index = i;
      });

      this.$element.find("tr").each(function(node) {
        var $node = $R.dom(node);
        var origCell = $node.find("td, th").get(index);
        var $origCell = $R.dom(origCell);

        $origCell.remove();
      });
    },

    // private
    _init: function(el) {
      var wrapper, element;
      if (typeof el !== "undefined") {
        var $node = $R.dom(el);
        var node = $node.get();
        var $figure = $node.closest("figure");
        if ($figure.length !== 0) {
          wrapper = $figure;
          element = $figure.find("table").get();
        } else if (node.tagName === "TABLE") {
          element = node;
        }
      }

      this._buildWrapper(wrapper);
      this._buildElement(element);
      this._initWrapper();
    },
    _addRowTo: function(current, position) {
      var $current = $R.dom(current);
      var $currentRow = $current.closest("tr");
      if ($currentRow.length !== 0) {
        var columns = $currentRow.children("td, th").length;
        var $newRow = this._buildRow(columns);

        $currentRow[position]($newRow);

        return $newRow;
      }
    },
    _buildRow: function(columns, tag) {
      tag = tag || "<td>";

      var $row = $R.dom("<tr>");
      for (var i = 0; i < columns; i++) {
        var $cell = $R.dom(tag);
        $cell.attr("contenteditable", true);

        $row.append($cell);
      }

      return $row;
    },
    _buildElement: function(node) {
      if (node) {
        this.$element = $R.dom(node);
      } else {
        this.$element = $R.dom("<table>");
        this.append(this.$element);
      }
    },
    _buildWrapper: function(node) {
      node = node || "<figure>";

      this.parse(node);
    },
    _initWrapper: function() {
      this.addClass("redactor-component");
      this.attr({
        "data-redactor-type": "table",
        tabindex: "-1",
        contenteditable: false
      });
    }
  });
})(Redactor);
