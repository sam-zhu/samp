/*!
 * dropdown-tree v0.0.1
 *
 * By Tony Chi(qiweiwei@shanghai3h.com)
 *
 * Copyright 2014 Shanghai3h, dropdown-tree
 * Licensed under the MIT license
 */

(function ($) {

    function DropDownTree() {
        this._defaults = {
            text: '请选择...'
        };
    }

    $.extend(DropDownTree.prototype, {
        builderClassName: 'dropdown-tree-maker',
        pluginName: 'dropdown-tree',

        event_onselect: 'dpt.onselect',

        _attachPlugin: function (target, options) {
            target = $(target);

            if (target.hasClass(this.builderClassName)) {
                return;
            }

            //build, and store default opts.
            var d = {
                options: $.extend({}, this._defaults),
                selected: 0
            };
            target.addClass(this.builderClassName)
                  .data(this.pluginName, d);

            this._optionPlugin(target, options);
        },

        _valuePlugin: function (target) {
            var target = $(target);
            var data = target.data(this.pluginName);

            return data.selected;
        },

        _optionPlugin: function (target, options, value) {
            target = $(target);

            var d = target.data(this.pluginName);

            if (!options || (typeof options == 'string' && value == null)) {
                var name = options;
                options = (d || {}).options;
                return (options && name ? options[name] : options);
            }

            if (!target.hasClass(this.builderClassName)) {
                return;
            }

            options = options || {};
            if (typeof options == 'string') {
                var name = options;
                options = {};
                options[name] = value;
            }

            $.extend(d.options, options);

            this._update(target, d);
        },

        _update: function (target, d) {
            target = $(target);

            this._generateHTML(target, d);
            target.hide();
        },
        treeObj: null,

        _generateHTML: function (target, d) {
            var $this = this;

            target = $(target);

            var id = target.attr('id'),
                cid = id + '_dpt',
                tid = cid + '_tree',
                bid = cid + '_btn';

            var ap = [];
            ap.push(
                '<div class="dropdown-tree form-control" id = ' + cid + '>',
                    '<button id="' + bid + '"class="dropdown-toggle" data-toggle="dropdown">',
                        '<span class="filter-option">' + d.options.text + '</span>&nbsp;<span class="dropdown-tree-arrow"><b></b></span>',
                    '</button>',
                    '<div class="dropdown-menu open">',
                        //'<div class="dropdown-tree-searchbox">',
                        //    '<input type="text" class="input-block-level form-control">',
                        //'</div>',
                        '<div id="' + tid + '">',
                        '</div>',
                    '</div>',
                '</div>');

            target.after(ap.join(''));

            var btn = $('#' + bid);

            var tree = $('#' + tid).jstree({
                'core': {
                    'data': d.options.dataList || d.options.dataAjax || []
                }
            })
            .on('select_node.jstree', function (e, args) {
                var n = args.node,
                    text = n.text;

                d.selected = { id: n.id || n.data.id, text: text, data: n.data };

                $('.filter-option', btn).html(text);
                btn.attr('title', text);
                btn.addClass('chosen');
                target.val(text);

                target.trigger($this.event_onselect, d.selected);


            })
            .on('load_node.jstree', function () {
                $('#' + tid).jstree('open_all');
            })
            .jstree('open_all');
            treeObj = tree;
        },

        //设置树选择值,根据data中的属性来匹配,调用方式:$('#t1').dropdownTree('select', {sid:20});
        _selectPlugin: function (target, value) {
            target = $(target);

            var id = target.attr('id'),
                cid = id + '_dpt',
                tid = cid + '_tree';

            function bInA(_b, _a) {
                if (!_a || !_b) {
                    return false;
                }
                var isequal = true;
                for (var i in _b) {
                    isequal = false;
                    if (_a.hasOwnProperty(i) || _a.isPrototypeOf(i)) {
                        isequal = _a[i] == _b[i];
                        if (!isequal) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
                return true;
            }

            var arr = $('#' + tid).jstree()._model.data;
            for (var i in arr) {
                var data = arr[i].data;
                if (bInA(value, data)) {
                    $('#' + tid).jstree('deselect_all', true);
                    $('#' + tid).jstree('select_node', arr[i]);
                    //treeObj.jstree('deselect_all', true);
                    //treeObj.jstree('select_node', arr[i]);

                    return true;
                }
            }
        }

    });

    $.fn.dropdownTree = function (opts) {
        var otherArgs = Array.prototype.slice.call(arguments, 1);

        if (typeof opts == 'string') {
            if (!plugin['_' + opts + 'Plugin']) {
                throw 'Unknown command: ' + opts;
            }

            return plugin['_' + opts + 'Plugin']
                .apply(plugin, [this].concat(otherArgs));
        }
        else {
            return this.each(function () {
                plugin._attachPlugin(this, opts || {});
            });
        }
    };

    var plugin = $.dropdownTree = new DropDownTree();

})(jQuery);
