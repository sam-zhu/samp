(function (win) {
    "use strict";

    /**
     * @class HorizontalBarStyle 色块样式
     * @param {Array} color 色块渐变色
     * @param {String} font 字体样式
     * @param {String} fontColor 字体颜色
    **/
    win.HorizontalBarStyle = {
        Green: { color: ["rgba(82, 178, 97, 1)"], highcolor: ["rgba(134, 201, 145, 1)"], font: "11px Arial", fontColor: "rgba(255, 255, 255, 1)" },
        Red: { color: ["rgba(227, 107, 107, 1)"], highcolor: ["rgba(235, 152, 152, 1)"], font: "11px Arial", fontColor: "rgba(255, 255, 255, 1)" },
        Silver: { color: ["rgba(145, 151, 157, 1)"], highcolor: ["rgba(167, 172, 177, 1)"], font: "11px Arial", fontColor: "rgba(255, 255, 255, 1)" },
        SkyBlue: { color: ["rgba(131, 204, 255, 1)"], highcolor: ["rgba(82, 178, 97, 1)"], font: "11px Arial", fontColor: "rgba(255, 255, 255, 1)" }
    };

    /**
    * @class HorizontalBarType 水平直方类型
    * @param {String} name 名称
    * @param {Array} value 值与样式对应关系，all:不在值范围内的样式，如果没有则不画，显示内容为原始值。
    * @param {Float} delta 最小忽略数据范围
    * @param {String} unit 数值单位
   **/
    win.HorizontalBarType = {
        CSP: {
            name: "定速泵",
            config: {
                "1": { desc: "开", style: HorizontalBarStyle.Green },
                "50": {desc: "开", style: HorizontalBarStyle.Green },
                "0": { desc: "关", style: HorizontalBarStyle.Red },
                "-1": { desc: "故障", style: HorizontalBarStyle.Silver }
            }
        },
        RSP: {
            name: "调速泵",
            config: {
                "0": { desc: "关", style: HorizontalBarStyle.Red },
                "-1": { desc: "故障", style: HorizontalBarStyle.Silver },
                "all": { desc: "开", style: HorizontalBarStyle.Green }
            },
            delta: 1,
            unit: "Hz"
        },
        PRESSURE: {
            name: "压力",
            config: {
                "all": { desc: "压力", style: HorizontalBarStyle.SkyBlue }
            },
            delta: 0.001,
            unit: "MPa"
        }
    };

    win.HorizontalBar = function (elm, option, menu) {
        var _Self = this;
        var _Ctrl = null;
        var _CTX = null;
        var _Item = new Array();
        var _TempItem = null;
        var _SelectedItem = null;
        var _Delegate = {};
        var _Path = "assets/plugins/chart/horizontal-bar/";
        var _Btn = [
            { key: "Set", title: "设置", func: OnSet },
            { key: "Cancel", title: "取消", func: OnCancel },
            { key: "Save", title: "保存", func: OnSave },
            { key: "New", title: "新增", func: OnNew },
            { key: "Remove", title: "删除", func: OnRemove },
            { key: "Update", title: "修改", func: OnUpdate }
        ];
        var _Style = {
            axisX: { title: "X", color: "#000000" },
            axisY: { title: "Y", color: "#000000", offset: 5 },
            bar: { space: 13, height: 19 },
            padding: { top: 12, bottom: 30, left: 90, right: 10 },
            distance: 1 * 24 * 60 * 60 * 1000,
            start: -1,
            width: 0,
            height: 0,
            edit: false,
            editPeriod: { t: null, d: null },   //t:null 不能编辑
            curTime: null,
            move: { x: null, y: null }
        };
        
        /**
         * @method OnMouseMoveCanvas canvas 移动效果
         * @param {Object} e window.event
        **/
        function OnMouseMoveCanvas(e) {
            var elm = win.document.getElementById("txt");
            if (elm) {
                elm.value = "";
                elm.value += "clientX: " + e.clientX + " | clientY: " + e.clientY + " | ";
                elm.value += "offsetX: " + e.offsetX + " | offsetY: " + e.offsetY + " | ";
                elm.value += "screenX: " + e.screenX + " | screenY: " + e.screenY + " | ";
                elm.value += "X: " + e.x + " | Y: " + e.y;
            }
            _Style.move.x = e.offsetX;
            _Style.move.y = e.offsetY;

            // 不越过Y轴
            if (e.offsetX < _Style.padding.left)
                _Style.move.x = _Style.padding.left;

            _Self.Refresh();
        };

        /**
         * @method OnClickCanvas canvas 双击效果
         * @param {Object} e window.event
        **/
        function OnClickCanvas(e) {
            if (!_Style.edit)
                return;
            _SelectedItem = null;

            var index = GetItemIndexByXY(e.offsetX, e.offsetY);
            if (index == null)
                return;
            _SelectedItem = { item_index: index, time_index: null };

            var time = GetTimeByAxisX(e.offsetX);
            var item = GetItem(index, time.valueOf());
            if (item == null)
                return;

            _SelectedItem.time_index = item.index;
        };

        /**
         * @method _Clone 对象复制
         * @param {Any} obj 原对象
        **/
        function _Clone(obj) {
            if (typeof (obj) != 'object')
                return obj;
            var rtn = {};
            if (obj.constructor == Array)
                rtn = [];
            for (var i in obj) {
                rtn[i] = _Clone(obj[i]);
            }
            return rtn;
        }

        /**
         * @method _ShowWarn 警告提醒
         * @param {String} msg 警告消息
        **/
        function _ShowWarn(msg) {
            if (_Delegate["OnWarn"])
                _Delegate["OnWarn"](msg, "提示");
            else
                alert(msg);
        }

        /**
         * @method _ShowError 错误提醒
         * @param {String} msg 错误消息
        **/
        function _ShowError(msg) {
            if (_Delegate["OnError"])
                _Delegate["OnError"](msg, "警告");
            else
                alert(msg);
        }

        /**
         * @method _DrawLine 绘画线段
         * @param {Array} points 点坐标 ([{x, y}, {x, y}, ...])
         * @param {Int32} width 线宽 (默认1)
         * @param {String} color 颜色 (默认#000000)
        **/
        function _DrawLine(points, width, color) {
            var offset = ((width % 2) == 1) ? 0.5 : 0;  //处理单数线宽多一个像素的现象
            _CTX.beginPath();
            for (var i = 0; i < points.length; i++) {
                if (i == 0)
                    _CTX.moveTo(points[i].x + offset, points[i].y + offset)
                else
                    _CTX.lineTo(points[i].x + offset, points[i].y + offset);
            }
            //_CTX.lineCap = "butt";        //线帽 butt|round|square
            _CTX.lineWidth = width;
            _CTX.strokeStyle = color;
            _CTX.stroke();
        };

        /**
         * @method _DrawRect 绘画矩形
         * @param {Int32} x 起点x坐标
         * @param {Int32} y 起点y坐标
         * @param {Int32} w 宽度
         * @param {Int32} h 高度
         * @param {Int32} width 线宽 (默认1)
         * @param {String} color 颜色 rgba(255, 255, 255, 1)
        **/
        function _DrawRect(x, y, w, h, width, color) {
            var points = new Array(2);
            points[0] = { x: x, y: y - 1 };
            points[1] = { x: x + w, y: points[0].y };
            _DrawLine(points, width, color);

            points[0] = { x: x + w, y: y };
            points[1] = { x: points[0].x, y: y + h };
            _DrawLine(points, width, color);

            points[0] = { x: x + w, y: y + h };
            points[1] = { x: x, y: points[0].y };
            _DrawLine(points, width, color);

            points[0] = { x: x, y: y + h };
            points[1] = { x: points[0].x, y: y };
            _DrawLine(points, width, color);
        }

        /**
         * @method _FillRect 绘画矩面
         * @param {Int32} x 起点x坐标
         * @param {Int32} y 起点y坐标
         * @param {Int32} width 宽度
         * @param {Int32} height 高度
         * @param {Object} style 样式 { color:[rgba(255, 255, 255, 1)...] }
        **/
        function _FillRect(x, y, width, height, style) {
            var gra = _CTX.createLinearGradient(x, y, x, y + height);
            for (var i = 0; i < style.color.length; i++)
                gra.addColorStop(i, style.color[i]);
            _CTX.fillStyle = gra;
            _CTX.fillRect(x, y, width, height);
        };

        /**
         * @method _DrawFont 绘画文字
         * @param {String} text 文字
         * @param {Int32} x x坐标
         * @param {Int32} y y坐标
         * @param {Object} style 文字样式   默认样式:{ font: 13px Arial, align: left, color: #000000 }
        **/
        function _DrawFont(text, x, y, style) {
            _CTX.font = (style.font == undefined) ? "13px Arial" : style.font;
            _CTX.textAlign = (style.align == undefined) ? "left" : style.align;
            _CTX.fillStyle = (style.color == undefined) ? "#000000" : style.color;
            _CTX.fillText(text, x, y);
        };

        /**
         * @method _DrawImage 绘画图片
         * @param {String} src 图片路径
         * @param {Int32} x x坐标
         * @param {Int32} y y坐标
        **/
        function _DrawImage(src, x, y) {
            var img = new Image();
            img.src = src;
            _CTX.drawImage(img, x, y);
        }

        /**
         * @method FillItem 绘画色块
         * @param {Object} item 绘画对象
         * @param {Int32} row y方向行号
         * @param {Int32} index 数据索引
         * @param {Boolean} highlight 是否高亮显示
        **/
        function FillItem(item, row, index, highlight) {
            var style = item.style.config[item.data[index].v];
            if (style == undefined)
                style = item.style.config["all"];
            if (style != null && style != undefined)
                style = style.style;

            if (style == null || style == undefined)
                return;

            //色块
            var posi = GetPositionByTime(item.data[index].t, (index + 1 == item.data.length) ? -1 : item.data[index + 1].t);
            var x = _Style.padding.left + posi.x;
            var y = GetAxisYByIndex(row);
            var fillStyle = { color: (highlight ? style.highcolor : style.color) };
            _FillRect(x, y, posi.width, _Style.bar.height, fillStyle);
            _DrawLine([{ x: x, y: y - 1 }, { x: x, y: y + _Style.bar.height }], 1, "rgba(255, 255, 255, 1)");

            //色块文字 27:文字显示最小宽度
            if (posi.width >= 27) {
                var desc = GetDescFromStatus(item, index, false);
                _DrawFont(desc, x + 3, y + 13, { font: style.font, color: style.fontColor });
            }
        };

        /**
         * @method FillItemHighLight 突出绘画色块(目前描一个边框)
         * @param {Object} item 绘画对象
         * @param {Int32} row y方向行号
         * @param {Int32} index 数据索引
         * @param {Object} style 样式
        **/
        function FillItemHighLight(item, row, index, style) {
            var posi = GetPositionByTime(item.data[index].t, (index + 1 == item.data.length) ? -1 : item.data[index + 1].t);
            var x = _Style.padding.left + posi.x;
            var y = GetAxisYByIndex(row);
            var value = item.data[index].v;
            var config = item.style.config[item.data[index].v];

            _FillRect(x, y, posi.width, _Style.bar.height, { color: config.style.highcolor });
            if (posi.width >= 27) {
                _DrawFont(config.desc, x + 3, y + 13, { font: config.style.font, align: "left", color: config.style.fontColor });
            }

           
        };

        /**
         * @method DrawBackground 绘画背景
        **/
        function DrawBackground() {
            var day = 24 * 60 * 60 * 1000;
            var d, points;
            for (var i = _Style.start; i <= (_Style.start + _Style.distance); i += day) {
                d = new Date(i);
                d = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
                if (d.valueOf() < _Style.start)
                    continue;

                //分割线
                points = new Array();
                points.push({
                    x:_Style.padding.left + _ConvertIntervalToDistance(d - _Style.start),
                    y: _Style.height - _Style.padding.bottom
                });
                points.push({
                    x: points[0].x,
                    y: points[0].y + 7
                });
                _DrawLine(points, 2, '#000000');

                //日期值
                var fontStyle = { font: "13px Arial", color:"#000000" };
                if ((_Style.width - points[1].x) < 54)  // 54 表示中文日期文字的最大长度
                    fontStyle.align = "right";
                _DrawFont((d.getMonth() + 1) + "月" + d.getDate() + "日", points[0].x, points[0].y + 27, fontStyle);
            }
        };

        /**
         * @method DrawAxisX 绘画 X 轴
        **/
        function DrawAxisX() {
            var points = new Array();
            points.push({
                x: _Style.padding.left,
                y: _Style.height - _Style.padding.bottom
            });
            points.push({
                x: _Style.width - _Style.padding.right,
                y: points[0].y
            });
            _DrawLine(points, 1, _Style.axisX.color);
        };

        /**
         * @method DrawAxisXLabel 绘画 X 轴刻度及标签
        **/
        function DrawAxisXLabel() {
            var hour = 60 * 60 * 1000;
            var scale = _ConvertIntervalToDistance(hour);
            scale = parseInt(50 / scale) + 1;   ///50 满足单个刻度范围内包含两个日期的显示

            var points, scale_style;
            for (var i = _Style.start; i <= _Style.start + _Style.distance; i += scale * hour) {
                ///x轴刻度
                points = new Array();
                points.push({
                    x: _Style.padding.left + _ConvertIntervalToDistance(i - _Style.start),
                    y: _Style.height - _Style.padding.bottom
                });
                points.push({
                    x: points[0].x,
                    y: points[0].y + 4
                });
                _DrawLine(points, 1, _Style.axisX.color);

                ///x轴文字
                var scale_text = new Date(i);
                scale_text = scale_text.getHours() + ":00";
                scale_style = { font: "11px Arial", align: "left", color: _Style.axisX.color };
                if ((_Style.width - points[1].x) < 30)  // 30 表示时间的最大长度
                    scale_style.align = "right";
                _DrawFont(scale_text, points[1].x, points[1].y + 11, scale_style);
            }
        };

        /**
         * @method DrawAxisY 绘画 Y 轴
        **/
        function DrawAxisY() {
            var points = new Array();
            points.push({
                x: _Style.padding.left,
                y: _Style.height - _Style.padding.bottom
            });
            points.push({
                x: points[0].x,
                y: _Style.padding.top
            });
            _DrawLine(points, 1, _Style.axisY.color);
        };

        /**
         * @method DrawAxisYLabel 绘画 Y 轴对象名称
         * @param {Object} item 绘画对象
         * @param {Int32} index 对象位置索引
        **/
        function DrawAxisYLabel(item, index) {
            var x = 0;
            var y = GetAxisYByIndex(index);
            _DrawImage(_Path + "img/Tag" + item.type + ".png", x, y + 3);

            x = _Style.padding.left - 14;
            y = y + _Style.bar.height - 5;

            var text = item.name;
            if (text.length > 5)
                text = text.substring(0, 5);
            _DrawFont(text, x, y, { font: "13px Arial", align: "right", color: _Style.axisY.color });
        };

        /**
         * @method DrawCurrentTime 指定时间画竖线
         * @param {Int32} t 时刻
         * @param {Int32} width 线宽
         * @param {String} color 颜色
        **/
        function DrawCurrentTime(t, width, color) {
            if (t != null && t >= _Style.start && _Style.curTime <= _Style.start + _Style.distance) {
                var x = _Style.padding.left + _ConvertIntervalToDistance(t - _Style.start);
                var y = _Style.padding.top;
                _DrawImage(_Path + "img/ArrowUp.png", x - 6, y - 6);
                var time = new Date(_Style.curTime);
                var hour = time.getHours();
                if (hour < 10) hour = "0" + hour;
                var minute = time.getMinutes();
                if (minute == 0) minute = "00";
                else if (minute < 10) minute = "0" + minute;
                var txt = hour + ":" + minute;

                _DrawFont(txt, x + 6, y, { font: "13px Arial", align: "left", color: _Style.axisY.color });
                y = _Style.height - _Style.padding.bottom + 15;
                _DrawImage(_Path + "img/ArrowDown.png", x - 6, y + 6);

            }
        };
        /**
         * @method DrawMoveEffect 绘画移动效果
        **/
        function DrawMoveEffect() {
            if (_Style.move.x == null || _Style.move.y == null
                || _Style.move.x == _Style.padding.left)
                return;
            
            var color = "#0090FF";
            var rtn = GetTimeByAxisX(_Style.move.x);

            //高亮色块
            var t = rtn.valueOf();
            var desc = null;
            var index = GetItemIndexByXY(_Style.move.x, _Style.move.y);
            if (index != null) {
                var item = GetItem(index, t);
                if (item != null) {
                    var obj = _Item[index];
                    FillItem(obj, index, item.index, true);
                    desc = obj.name + " " + GetDescFromStatus(obj, item.index, true);
                }
            }

            //移动轴
            var points = new Array();
            points.push({
                x: _Style.move.x,
                y: _Style.height - _Style.padding.bottom
            });
            points.push({
                x: points[0].x,
                y: _Style.padding.top
            });
            _DrawLine(points, 1, color);

            //移动时刻(建议增加白色背景)
            var hour = rtn.getHours();
            if (hour < 10) hour = "0" + hour;
            var minute = rtn.getMinutes();
            if (minute == 0) minute = "00";
            else if (minute < 10) minute = "0" + minute;
            var txt = hour + ":" + minute ;
            if (desc != null) txt += " " + desc;
            var fontStyle = { font: "13px Arial", color: color };
            if ((_Style.width - points[1].x) < 100)  // 100 表示时间文字的最大长度
                fontStyle.align = "right";
            _DrawFont(txt, points[1].x, points[1].y, fontStyle);
        };

        /**
         * @method _ConvertIntervalToDistance 时段转像素
         * @param {Int32} time 时段长度 Date.valueOf()
         * @return {Int32} 像素长度
        **/
        function _ConvertIntervalToDistance(interval) {
            return Math.round(interval * (_Style.width - _Style.padding.left - _Style.padding.right) / _Style.distance);
        }

        /**
         * @method _ConvertDistanceToInterval 像素转时段
         * @param {Int32} width 像素长度
         * @return {Int32} 时段长度
        **/
        function _ConvertDistanceToInterval(distance) {
            return Math.round(distance * _Style.distance / (_Style.width - _Style.padding.left - _Style.padding.right));
        }

        /**
         * @method InitBarStatus 初始化绘图初始值
         * @param {Object} param 参数
        **/
        function InitBarStatus(param) {
            if (param != undefined && param != null) {
                if (param.start)
                    _Style.start = parseInt(Date.parse(param.start) / (60 * 60 * 1000)) * 3600000;
                if (param.distance)
                    _Style.distance = param.distance * 60 * 60 * 1000;
                if (param.current)
                    _Style.curTime = Date.parse(param.current);
                if (param.editPeriod) {
                    _Style.editPeriod.t = Date.parse(param.editPeriod.t);
                    _Style.editPeriod.d = param.editPeriod.d * 60 * 1000;
                }
            }
        }

        /**
         * @method GetItem 获取移动中经过的对象
         * @param {Int32} index 数据索引
         * @param {Int32} time 时刻
         * @return {Object} {index: 时刻索引, side: 是否贴边}
        **/
        function GetItem(index, time) {
            if (index < 0 || index >= _Item.length)
                return null;
            
            var rtn = 0;
            var is_side = false;
            var item = _Item[index];
            for (var i = 0; i < item.data.length; i++) {
                if (time < item.data[i].t)
                    break;
                if (time == item.data[i].t)
                    is_side = true;
                rtn = i;
            }
            return { index: rtn, side: is_side };
        }

        /**
         * @method GetItemIndexByXY 根据 XY 坐标获取落在的数据块上
         * @param {Int32} x x坐标
         * @param {Int32} y y坐标
        **/
        function GetItemIndexByXY(x, y) {
            if (x <= _Style.padding.left
                || x > (_Style.width - _Style.padding.right))
                return null;
            if (y >= (_Style.height - _Style.padding.bottom)
                || y < (_Style.padding.top + _Style.axisY.offset))
                return null;

            var delta = _Style.height - _Style.padding.bottom - y;
            var index = Math.floor(delta / (_Style.bar.height + _Style.bar.space));
            delta = (delta / (_Style.bar.height + _Style.bar.space)) % 1;
            if (delta * (_Style.bar.height + _Style.bar.space) <= _Style.bar.space)
                return null;
            return index;
        }

        /**
         * @method GetPositionByTime 获取时刻为 time 的绘画位置
         * @param {Int32} time 时刻
         * @param {Int32} next_time 下一时刻 -1 表示最后一个
         * @return {Object} { x, width }
        **/
        function GetPositionByTime(time, next_time) {
            var start = _ConvertIntervalToDistance(time - _Style.start);
            if (start < 0)
                start = 0;
            var end = _Style.width - _Style.padding.left - _Style.padding.right;
            if (next_time != -1)
                end = _ConvertIntervalToDistance(next_time - _Style.start);
            if (end < 0)
                end = 0;
            return { x: start, width: end - start };
        };

        /**
         * @method GetTimeByAxisX 通过坐标获取时刻
         * @param {Int32} x x坐标
         * @return {Date}
        **/
        function GetTimeByAxisX(x) {
            var t = _Style.start + _ConvertDistanceToInterval(x - _Style.padding.left);
            return new Date(t);
        };

        /**
         * @method GetAxisXByTime 通过时刻获取 X 坐标
         * @param {Int32} t 
         * @return {Int32} offsetX
        **/
        function GetAxisXByTime(t) {
            return _ConvertIntervalToDistance(t - _Style.start);
        }

        /**
         * @method GetAxisYByIndex 通过索引获取 Y 坐标
         * @param {Int32} index 索引
         * @return {Int32} offsetY
        **/
        function GetAxisYByIndex(index) {
            return _Style.height - _Style.padding.bottom - (index + 1) * (_Style.bar.height + _Style.bar.space);
        };

        /**
         * @method GetDescFromStatus 获取指定项的描述文本
         * @param {Object} item 对象信息
         * @param {Int32} index 时标
         * @param {Boolean} unit 是否包含单位标志位
        **/
        function GetDescFromStatus(item, index, unit) {
            var desc = item.data[index].v;
            if (item.style.config[desc] != undefined)
                desc = item.style.config[desc].desc;
            if (unit && item.style.unit) {
                if (!item.style.config[item.data[index].v])
                    desc += item.style.unit;
            }
            return desc;
        };

        /**
         * @method GetDrawHeight 获取图形绘画高度
        **/
        function GetDrawHeight() {
            var DrawHeight = 0;
            //图形高度
            DrawHeight += _Item.length * (_Style.bar.height + _Style.bar.space) + _Style.axisY.offset;
            //图形上下偏移
            DrawHeight += _Style.padding.top + _Style.padding.bottom;
            return DrawHeight;
        };

        /**
         * @method ArraySortFunc 数组排序函数
         * @param {Object} first 当前元素
         * @param {Object} next 下一个元素
        **/
        function ArraySortFunc(first, next) {
            return (first.t - next.t);
        }

        /**
         * @method ArrayCompressFunc 数组压缩函数
         * @param {Object} item 对象元素
        **/
        function ArrayCompressFunc(item) {
            var delta_t = 0;
            var delta_v = 0;
            var pre_index = 0;
            var index = new Array();
            for (var i = 1; i < item.data.length; i++) {
                delta_v = Math.abs(item.data[i].v - item.data[pre_index].v);
                delta_t = _ConvertIntervalToDistance(item.data[i].t - item.data[pre_index].t);
                if (delta_v == 0 || delta_t == 0)
                    index.push(i);
                else if (item.style.delta && delta_t < 30 && delta_v < item.style.delta) //查找在 30 个像素内，delta 小于指定范围的数据
                    index.push(i);
                else
                    pre_index = i;
            }

            //删除符合条件的数据
            for (var i = index.length - 1; i >= 0; i--)
                item.data.splice(index[i], 1);
        };

        /**
         * @method ItemCreate 创建对象
         * @param {Object} param 对象基本信息
        **/
        this.ItemCreate = function (param) {
            for (var i = 0; i < _Item.length; i++) {
                if (_Item[i].key == param.key) {
                    _Item[i] = param;
                    return;
                }
            }
            _Item.push(param);
            _CTX.canvas.height = _Style.height = GetDrawHeight();
        };

        /**
         * @method ObjectRemove 删除对象
         * @param {Any} key 对象标识符 (if key is undefined, Remove All.)
        **/
        this.ItemRemove = function (key) {
            var Index = -1;
            if (key != undefined) {
                for (var i = 0; i < _Item.length; i++) {
                    if (_Item[i].key == key) {
                        Index = i;
                        break;
                    }
                }
                if (Index != -1) {
                    _Item.splice(Index, 1);
                    _CTX.canvas.height = _Style.height = GetDrawHeight();
                }
                return;
            }
            _Item = new Array();
            _CTX.canvas.height = _Style.height = GetDrawHeight();
        };

        /**
         * @method ObjectRemove 查找对象
         * @param {Any} key 对象标识符
        **/
        this.ItemFind = function (key) {
            var index = -1;
            for (var i = 0; i < _Item.length; i++) {
                if (_Item[i].key == key) {
                    index = i;
                    break;
                }
            }
            return (index == -1) ? null : _Item[index];
        }

        /**
         * @method AddData 添加对象数据
         * @param {Any} key 对象标识符
         * @param {Array} data 数据 [{t: '2014-01-01 00:00:00', v: 1},...]
        **/
        this.AddData = function (key, data) {
            var item = this.ItemFind(key);
            if (item == null)
                return;

            if (item.data == undefined)
                item.data = new Array();

            //添加数据并排序
            for (var i = 0; i < data.length; i++) {
                data[i].t = Date.parse(data[i].t);
                data[i].v = parseFloat(data[i].v)
                item.data.push(data[i]);
            }
            item.data.sort(ArraySortFunc);

            ArrayCompressFunc(item);
        };

        /**
         * @method DelData 删除对象数据
         * @param {Any} key 对象标识符
         * @param {Date} st 开始时间 (删除范围大于等于 st, null:忽略)
         * @param {Date} et 结束时间 (删除范围小于等于 et, null:忽略)
        **/
        this.DelData = function (key, st, et) {
            var index = new Array();
            var item = this.ItemFind(key);
            if (item != null && (st != null || et != null)) {
                for (var i = 0 ; i < item.data.length; i++) {
                    if (st != null && item.data[i].t >= st)
                        index.push(i);
                    else if (et != null && item.data[i].t <= et)
                        index.push(i);
                }
                for (var i = index.length - 1; i >= 0; i--) {
                    item.splice(index[i], 1);
                }
                ArrayCompressFunc(item);
            }
        };

        /**
         * @method Refresh 绘画
         * @param {Object} param 绘画参数 { start: "yyyy-MM-dd HH:mm", current: "yyyy-MM-dd HH:mm", editPeriod : { t:"yyyy-MM-dd HH:mm", d:minutes} }
        **/
        this.Refresh = function (param) {
            InitBarStatus(param);

            _CTX.clearRect(0, 0, _CTX.canvas.width, _CTX.canvas.height);

            // 底图
            DrawBackground();

            // 主图
            var obj = null, pre_index = -1;
            for (var i = 0; i < _Item.length; i++) {
                obj = _Item[i];
                for (var k = 0; k < obj.data.length; k++)
                    FillItem(obj, i, k, false);
                DrawAxisYLabel(obj, i);
            }

            // 移动
            DrawMoveEffect();

            // 选中对象
            if (_Style.edit && _SelectedItem != null && _SelectedItem.time_index != null) {
                FillItemHighLight(_Item[_SelectedItem.item_index], _SelectedItem.item_index, _SelectedItem.time_index, { color: ["rgba(0, 0, 255, 1)"] });
            }

            // XY轴
            DrawAxisX();
            DrawAxisXLabel();
            DrawAxisY();

            // 当前时刻
            DrawCurrentTime(_Style.curTime, 2, '#00FF00');
        };

        /**
         * @method GetCtrlHeight 获取控件绘画高度
        **/
        this.GetCtrlHeight = function () {
            return GetDrawHeight();
        };

        /**
         * @method IsEdit 返回控件是否处于编辑状态
        **/
        this.IsEdit = function () {
            return _Style.edit;
        }

        /**
         * @method OnSet 进入编辑状态
        **/
        function OnSet() {
            if (_Style.editPeriod.t == null) {
                _ShowError("未设置可编辑的时段范围!");
                return;
            }

            if (!_Style.edit) {
                _Style.edit = true;
                _SelectedItem = null;
                _TempItem = _Clone(_Item);

                for (var i = 0 ; i < _Btn.length; i++) {
                    if (_Btn[i].key == "Set") {
                        _Btn[i].ctrl.disabled = false;
                        continue;
                    }
                    _Btn[i].ctrl.style.display = "inline";
                }
            }
        };

        /**
         * @method OnCancel 放弃编辑内容
        **/
        function OnCancel() {
            if (_Delegate["OnConfirm"]) {
                _Delegate["OnConfirm"]("是否取消泵图修改内容？", function (rtn) {
                    if (!rtn)
                        return;
                    _Style.edit = false;
                    _Item = _TempItem;
                    _TempItem = null;
                    for (var i = 0 ; i < _Btn.length; i++) {
                        if (_Btn[i].key == "Set") {
                            _Btn[i].ctrl.disabled = true;
                            continue;
                        }
                        _Btn[i].ctrl.style.display = "none";
                    }
                    _Self.Refresh();
                });
            }
        };

        /**
         * @method OnSave 提交编辑内容
        **/
        function OnSave() {
            if (_Delegate["OnConfirm"]) {
                _Delegate["OnConfirm"]("是否保存泵图修改内容？", function (rtn) {
                    if (!rtn)
                        return;
                    _Style.edit = false;
                    _TempItem = null;
                    for (var i = 0 ; i < _Btn.length; i++) {
                        if (_Btn[i].key == "Set") {
                            _Btn[i].ctrl.disabled = false;
                            continue;
                        }
                        _Btn[i].ctrl.style.display = "none";
                    }
                    if (_Delegate["OnSave"]) {
                        var rtn = _Clone(_Item);
                        _Delegate["OnSave"]({ data: rtn, start: _Style.start, distance: _Style.distance });
                    }
                });
            }
        };

        /**
         * @method OnNew 新增记录
        **/
        function OnNew(e, t, v) {
            if (_SelectedItem == null) {
                _ShowError("请选择需要新增的设备");
                return;
            }

            var item = _Item[_SelectedItem.item_index];
            var param = {
                operate: "NEW",
                name: item.name,
                type: item.type,
                time: _Style.start,
                value: 1
            };

            if (t) param.time = t;
            if (v) param.value = v;

            if (_Delegate["OnShowPage"])
                _Delegate["OnShowPage"](param, function (rtn) {
                    if (rtn) {
                        var rtn_t = Date.parse(rtn.data[0].t);
                        if (rtn_t < _Style.editPeriod.t || rtn_t > (_Style.editPeriod.t + _Style.editPeriod.d)) {
                            _ShowError("新增的时间段不在可编辑范围内");
                            OnNew(null, rtn_t, rtn.data[0].v);
                        }
                        else {
                            _Self.AddData(item.key, rtn.data);
                            _Self.Refresh();
                        }
                    }
                });
        };

        /**
         * @method OnRemove 删除记录
        **/
        function OnRemove() {
            if (_SelectedItem == null || _SelectedItem.time_index == null) {
                _ShowError("请选择需要删除的内容");
                return;
            }

            var item = _Item[_SelectedItem.item_index];
            if (item.data[_SelectedItem.time_index].t < _Style.editPeriod.t
                || item.data[_SelectedItem.time_index].t > (_Style.editPeriod.t + _Style.editPeriod.d)) {
                _ShowError("选择的时间段不在可删除范围内");
                return;
            }

            if (_Delegate["OnConfirm"]) {
                var time = new Date(item.data[_SelectedItem.time_index].t);
                time = time.getHours() + "点" + time.getMinutes() + "分";
                var message = "是否删除 [" + item.name + " " + time + " " + GetDescFromStatus(item, _SelectedItem.time_index, null) + "]";
                _Delegate["OnConfirm"](message, function (rtn) {
                    if (rtn) {
                        item.data.splice(_SelectedItem.time_index, 1);
                        ArrayCompressFunc(item);
                        _SelectedItem = null;
                        _Self.Refresh();
                        _ShowWarn("数据删除完成");
                    }
                })
            }
        };

        /**
         * @method OnUpdate 修改记录
        **/
        function OnUpdate() {
            if (_SelectedItem == null || _SelectedItem.time_index == null) {
                _ShowError("请选择需要修改的内容");
                return;
            }

            var item = _Item[_SelectedItem.item_index];
            if (item.data[_SelectedItem.time_index].t < _Style.editPeriod.t
                || item.data[_SelectedItem.time_index].t > (_Style.editPeriod.t + _Style.editPeriod.d)) {
                _ShowError("选择的时间段不在可编辑范围内");
                return;
            }

            var param = {
                operate: "UPDATE",
                name: item.name,
                type: item.type,
                time: item.data[_SelectedItem.time_index].t,
                value: item.data[_SelectedItem.time_index].v
            };

            if (_Delegate["OnShowPage"])
                _Delegate["OnShowPage"](param, function (rtn) {
                    if (rtn) {
                        item.data[_SelectedItem.time_index].v = rtn.data[0].v;
                        ArrayCompressFunc(item);
                        _SelectedItem = null;
                        _Self.Refresh();
                        _ShowWarn("数据修改完成");
                    }
                });
        };

        /**
         * @method Dispose 内存释放
        **/
        this.Dispose = function () {
            if (_Ctrl != null) {
                _Ctrl.removeEventListener("mousemove", OnMouseMoveCanvas, false);
                _Ctrl.removeEventListener("click", OnClickCanvas, false);
                elm.removeChild(_Ctrl);
                _CTX = null;
            }

            if (menu) {
                for (var i = 0; i < _Btn.length; i++) {
                    if (_Btn[i].ctrl && menu.contains(_Btn[i].ctrl)) {
                        menu.removeChild(_Btn[i].ctrl);
                        delete _Btn[i].ctrl;
                    }
                }
            }
        };
        this.Dispose();

        // 菜单
        if (menu) {
            for (var i = _Btn.length - 1; i >= 0; i--) {
                _Btn[i].ctrl = win.document.createElement("img");
                _Btn[i].ctrl.src = _Path + "img/" + _Btn[i].key + ".png";
                _Btn[i].ctrl.title = _Btn[i].title;
                _Btn[i].ctrl.style.width = "16px";
                _Btn[i].ctrl.style.height = "16px";
                _Btn[i].ctrl.style.marginRight = "10px";
                _Btn[i].ctrl.style.cursor = "pointer";
                _Btn[i].ctrl.style.display = (_Btn[i].key == "Set") ? "inline" : "none";
                _Btn[i].ctrl.addEventListener("click", _Btn[i].func, false);
                menu.insertBefore(_Btn[i].ctrl, null);
            }
        }

        // Canvas 对象
        _Ctrl = win.document.createElement("canvas");
        _Ctrl.addEventListener("mousemove", OnMouseMoveCanvas, false);
        _Ctrl.addEventListener("click", OnClickCanvas, false);
        elm.insertBefore(_Ctrl, null);

        if (_Ctrl.getContext) {
            _CTX = _Ctrl.getContext('2d');
        }
        if (_CTX == null) {
            alert("canvas init error.");
            return;
        }

        _CTX.canvas.width = _Style.width = elm.clientWidth;

        if (option) {
            if (option.delegate)
                _Delegate = option.delegate;

            InitBarStatus(option);

            if (option.items) {
                for (var i = 0; i < option.items.length; i++) {
                    this.ItemCreate({ key: option.items[i].key, name: option.items[i].name, style: HorizontalBarType[option.items[i].type], type: option.items[i].type });
                    this.AddData(option.items[i].key, option.items[i].data);
                }
            }
        }

        _CTX.canvas.height = _Style.height = GetDrawHeight();
        this.Refresh();
    }
})(window);