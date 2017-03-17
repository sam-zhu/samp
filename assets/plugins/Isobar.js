// Isobar class
(function (root) {

    var Isobar = (function (global) {
        'use strict'

        var Isobar = function () {//context, samples, counterValues, colorLevels, opacity
            //if (!context || !samples || !counterValues || !colorLevels)
            //throw 'not has enough parameters.'

            //this.context = context;  // 容器
            //this.samples = samples;  // 样本点集合
            //this.counterValues = counterValues; // 等值
            //this.colorLevels = colorLevels; // 颜色级别
            //this.width = context.canvas.width;  // 面板宽度
            //this.height = context.canvas.height; // 面板高度
            //this.row = 10; // 行线数
            //this.col = 10; // 列线数
            //this.radius = 100000; // 网格点插值的半径

            this.smoothTimes = 10; // 线平滑的次数
            this.smoothEquant = 4; // 线平滑的等分数
            this.limitePointCount = 100; // 网格点插值的最大计算数

            this.opacity = 1; // 不透明度,默认为1
            this.hasDraw = false; // 是否已经绘制等值线
        }

        return Isobar;
    })(this);

    // 等值点
    var IsoPoint = function (x, y, inBoundary) {
        this.x = x || 0;
        this.y = y || 0;
        this.inBoundary = inBoundary || false; // 是否在边界上
    };

    // 等值线段
    var Segment = function (start, end) {
        this.startPoint = start;
        this.endPoint = end;
    };

    // 等值线
    var Spline = function (key, points, open) {
        this.key = key;
        this.points = points;
        this.isOpen = open;  // 是否为开区间等值线
    };

    // 填充区域
    var Region = function (points, open, values) {
        this.points = points || new Array();
        this.isOpen = open || false; // 是否为开区间等值线
        this.isobarValues = values || new Array(); // 包含的等值线个数
    };

    // 根据已有的点插值出网格点值，使用反权距离平均法
    // samples -> 样本数据
    // row 	   -> 行数
    // col     -> 列数
    // width   -> 宽度
    // height  -> 高度
    // counterValues -> 等值划分集合
    // xyRange -> xy坐标的最大最小范围
    // radius  -> 插值搜索半径
    // limitePointCount -> 插值个数
    var createGrid = function (samples, row, col, width, height, counterValues, xyRange, radius, limitePointCount) {
        var data = new Array();
        var rowInterval = height / (row - 1); //5299
        var colInterval = width / (col - 1); //4177.49
        for (var i = 0; i < row; i++) {//循环纵轴
            data[i] = new Array();
            for (var j = 0; j < col; j++) {//循环横轴
                var nPointCount = 0,
				 	fSumDInverse = 0,
				 	fSumPDivideD = 0,
				 	fSumDInverse0 = 0,
				 	fSumPDivideD0 = 0;
                var fx = j == 0 ? xyRange.xMin : xyRange.xMin + colInterval * j;
                var fy = i == 0 ? xyRange.yMin : xyRange.yMin + rowInterval * i;

                for (var k = 0, len = samples.length; k < len; k++) {
                    var dx = fx - samples[k].x,
						dy = fy - samples[k].y;
                    var fDistance = dx * dx + dy * dy;
                    if (fDistance <= 0.0001)
                        fDistance = 1;

                    if (fDistance <= radius) {
                        fSumDInverse += (1 / fDistance);
                        fSumPDivideD += (samples[k].v / fDistance);

                        if ((++nPointCount) == limitePointCount)
                            break;
                    }

                    if (nPointCount == 0) {
                        fSumDInverse0 += (1 / fDistance);
                        fSumPDivideD0 += (samples[k].v / fDistance);
                    }
                }

                var v = (nPointCount > 0 ? (fSumPDivideD / fSumDInverse) : (fSumPDivideD0 / fSumDInverse0));
                // 对格网点处的值等于等值线值的处理					
                for (var m = 0; m < counterValues.length; m++) {
                    if (v === counterValues[m])
                        v += 0.0001;
                }
                data[i][j] = v;
            }
        }

        return data;
    }

    //全局记录网格
    var GridData = [];
    // 根据已有的点插值出网格点值，使用反权距离平均法（地图所用）
    // samples -> 样本数据
    // row 	   -> 行数
    // col     -> 列数
    // width   -> 宽度
    // height  -> 高度
    // counterValues -> 等值划分集合
    // xyRange -> xy坐标的最大最小范围
    // radius  -> 插值搜索半径
    // limitePointCount -> 插值个数
    var createGrid_MAP = function (samples, row, col, width, height, counterValues, xyRange, radius, limitePointCount) {
        var dataMap = new Array();
        var data = new Array();
        var rowInterval = height / (row - 1); //5299
        var colInterval = width / (col - 1); //4177.49
        for (var i = 0; i < row; i++) {//循环纵轴
            dataMap[i] = new Array();
            data[i] = new Array();
            for (var j = 0; j < col; j++) {//循环横轴
                var nPointCount = 0,
				 	fSumDInverse = 0,
				 	fSumPDivideD = 0,
				 	fSumDInverse0 = 0,
				 	fSumPDivideD0 = 0;
                var fx = j == 0 ? xyRange.xMin : xyRange.xMin + colInterval * j;
                var fy = i == 0 ? xyRange.yMin : xyRange.yMin + rowInterval * i;

                for (var k = 0, len = samples.length; k < len; k++) {
                    var dx = fx - samples[k].x,
						dy = fy - samples[k].y;
                    var fDistance = dx * dx + dy * dy;
                    if (fDistance <= 0.0001)
                        fDistance = 1;

                    if (fDistance <= radius) {
                        fSumDInverse += (1 / fDistance);
                        fSumPDivideD += (samples[k].v / fDistance);

                        if ((++nPointCount) == limitePointCount)
                            break;
                    }

                    if (nPointCount == 0) {
                        fSumDInverse0 += (1 / fDistance);
                        fSumPDivideD0 += (samples[k].v / fDistance);
                    }
                }

                var v = (nPointCount > 0 ? (fSumPDivideD / fSumDInverse) : (fSumPDivideD0 / fSumDInverse0));
                // 对格网点处的值等于等值线值的处理					
                for (var m = 0; m < counterValues.length; m++) {
                    if (v === counterValues[m])
                        v += 0.0001;
                }
                dataMap[i][j] = { x: fx, y: fy, v: v };
                data[i][j] = v;
            }
        }
        var gridObj = { dataValue: data, dataMap: dataMap };
        return gridObj;
    }


    // 根据数值取得相应的色值
    var getColor = function (v, colorLevels) {
        for (var i = 0, len = colorLevels.length; i < len; i++) {
            var colorLevel = colorLevels[i];
            if (v > colorLevel.valueMin && v <= colorLevel.valueMax) {
                return colorLevel.color;
            }
        }
        // 默认返回
        return "#ffffff";
    }

    //线性插值计算
    var interp = function (xa, ya, xb, yb, yy) {
        if ((yb - ya) !== 0) {
            return xa + (yy - ya) * (xb - xa) / (yb - ya);
        } else {
            return 0;
        }
    };

    //处理等值点坐标值为整数
    // 不做整数处理，否则在填充区块时会出现多条等值线在边界共点的情况
    var round = function (x, distance, span) {
        //return Math.round(distance / span * x);
        return distance / span * x;
        //return x
    };

    //比较值大小后排序
    var reorder = function (i, j, k, value) {
        var temp,
        	large = i,
        	medium = j,
        	small = k;
        if (value[small] > value[medium]) {
            temp = medium;
            medium = small;
            small = temp;
        }
        if (value[medium] > value[large]) {
            temp = large;
            large = medium;
            medium = temp;
        }
        if (value[small] > value[medium]) {
            temp = medium;
            medium = small;
            small = temp;
        }

        return [small, medium, large];
    };

    // 调整线段的起止点顺序
    var _swapPoints = function (segment) {
        var temp = segment.startPoint;
        segment.startPoint = segment.endPoint;
        segment.endPoint = temp;
        return segment;
    }

    var seperateLines = function (key, segments) {
        // 找出所有在边界的线段
        var boundarySegments = [];
        for (var i = 0, len = segments.length; i < len; i++) {
            var segment = segments[i];
            segment["used"] = false;
            var start = segment.startPoint,
				end = segment.endPoint;
            if (start.inBoundary || end.inBoundary) {
                boundarySegments.push(segment);
            }
        }

        var splines = new Array();
        // 开区间等值线
        for (var j = 0; j < boundarySegments.length; j++) {
            var boundarySegment = boundarySegments[j];
            if (!boundarySegment.used) {
                boundarySegment.used = true;
                if (!boundarySegment.startPoint.inBoundary &&
					boundarySegment.endPoint.inBoundary) {
                    boundarySegment = _swapPoints(boundarySegment);
                }
                var line = new Array();
                line.push(boundarySegment.startPoint, boundarySegment.endPoint);
                var end = boundarySegment.endPoint;
                while (!end.inBoundary) {
                    for (var i = 0; i < segments.length; i++) {
                        var segment = segments[i];
                        if (segment.used) continue;
                        if (end.x == segment.startPoint.x && end.y == segment.startPoint.y) {
                            line.push(segment.endPoint);
                            end = segment.endPoint;
                            segment.used = true;
                            break;
                        } else if (end.x == segment.endPoint.x && end.y == segment.endPoint.y) {
                            line.push(segment.startPoint);
                            end = segment.startPoint;
                            segment.used = true;
                            break;
                        }
                    }
                }
                if (line.length < 3) continue;
                var spline = new Spline(Number(key), line, true);
                splines.push(spline);
            }
        }

        //闭区间等值线
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            if (segment.used) continue;
            var line = new Array();
            line.push(segment.startPoint, segment.endPoint);
            segment.used = true;
            var start = segment.startPoint
            var end = segment.endPoint;
            while (end.x != start.x || end.y != start.y) {
                for (var j = 0; j < segments.length; j++) {
                    var _segment = segments[j];
                    if (_segment.used) continue;
                    if (end.x == _segment.startPoint.x && end.y == _segment.startPoint.y) {
                        line.push(_segment.endPoint);
                        end = _segment.endPoint;
                        _segment.used = true;
                        break;
                    } else if (end.x == _segment.endPoint.x && end.y == _segment.endPoint.y) {
                        line.push(_segment.startPoint);
                        end = _segment.startPoint;
                        _segment.used = true;
                        break;
                    }
                }
            }
            if (line.length < 3) continue;
            var spline = new Spline(Number(key), line, false);
            splines.push(spline);
        }

        return splines;
    };

    var GetSeperateLines = function (contourLines) {
        var splines = new Array();
        for (var key in contourLines) {
            var segments = contourLines[key];
            var lines = seperateLines(key, segments);
            splines = splines.concat(lines);
        }
        return splines;
    };

    // 绘制单条等值线
    var drawLine = function (line, color, context) {
        context.beginPath();
        context.moveTo(line[0].x, line[0].y);
        for (var m = 1; m < line.length; m++) {
            context.lineTo(line[m].x, line[m].y);
        }
        context.lineWidth = 1;
        context.strokeStyle = color;
        context.stroke();
    };

    // 平滑处理单条等值线
    var smoothLine = function (line, times, equant) {
        for (var i = 0; i < times; i++) {
            for (var j = 1, len = line.length; j < len - 1; j++) {
                var pointA = line[j - 1],
					pointB = line[j],
					pointC = line[j + 1];
                var pointB1 = new IsoPoint();
                pointB1.x = pointB.x - (pointB.x - pointA.x) / equant;
                pointB1.y = pointB.y - (pointB.y - pointA.y) / equant;
                var pointB2 = new IsoPoint();
                pointB2.x = pointB.x + (pointC.x - pointB.x) / equant;
                pointB2.y = pointB.y - (pointB.y - pointC.y) / equant;

                pointB.x = pointB1.x;
                pointB.y = pointB1.y;
                line.splice(j + 1, 0, pointB2);

                len++;
                j += 2;
            }
        }
        return line;
    };

    // 等值线标注
    var drawLabel = function (line, key, context) {
        var len = line.length;
        var i = Math.round(len / 2);
        var pt = line[i];
        context.fillText(key, pt.x, pt.y);
    }

    // 计算数值集合的平均值
    var average = function (array) {
        var len = array.length;
        if (len === 0) return 0;
        var average = 0;
        for (var i = 0; i < len; i++) {
            average += (array[i] / len);
        }
        return average;
    }

    // 获取所有边界点
    var getBoundaryNodes = function (splines) {
        var boundaryNodes = new Array();
        for (var i = 0, len = splines.length; i < len; i++) {
            var spline = splines[i];
            if (spline.isOpen) {
                var nodes = spline.points;
                var count = nodes.length;
                if (count == 1) continue;
                var node1 = nodes[0],
					node2 = nodes[count - 1];
                var boundaryNode1 = new IsoPoint(node1.x, node1.y, node1.inBoundary);
                var boundaryNode2 = new IsoPoint(node2.x, node2.y, node2.inBoundary);
                boundaryNodes.push(boundaryNode1, boundaryNode2);
            }
        }

        return boundaryNodes;
    }

    // 获取矩形四个角点
    var getCornerNodes = function (width, height) {
        return {
            lt: new IsoPoint(0, 0, true),
            lb: new IsoPoint(0, height, true),
            rb: new IsoPoint(width, height, true),
            rt: new IsoPoint(width, 0, true)
        }
    }

    // 逆时针排列在边界上的点
    var counterClock = function (boundaryNodes, width, height) {
        var orderedBoundaryNodes = new Array();
        var corners = getCornerNodes(width, height);
        var sideBoundaryNodes = getSideBoundaryNodes(boundaryNodes, width, height);
        // 以矩形左上角点为起点，逆时针排列
        // LEFT边界
        orderedBoundaryNodes.push(corners.lt);
        var leftSideBoundaryNodes = sideBoundaryNodes.left;
        leftSideBoundaryNodes = orderSideBoundaryNodes(leftSideBoundaryNodes, "LEFT");
        orderedBoundaryNodes = orderedBoundaryNodes.concat(leftSideBoundaryNodes);
        //下边界
        orderedBoundaryNodes.push(corners.lb);
        var downSideBoundaryNodes = sideBoundaryNodes.down;
        downSideBoundaryNodes = orderSideBoundaryNodes(downSideBoundaryNodes, "DOWN");
        orderedBoundaryNodes = orderedBoundaryNodes.concat(downSideBoundaryNodes);
        // RIGHT边界
        orderedBoundaryNodes.push(corners.rb);
        var rightSideBoundaryNodes = sideBoundaryNodes.right;
        rightSideBoundaryNodes = orderSideBoundaryNodes(rightSideBoundaryNodes, "RIGHT");
        orderedBoundaryNodes = orderedBoundaryNodes.concat(rightSideBoundaryNodes);
        // 上边界
        orderedBoundaryNodes.push(corners.rt);
        var upSideBoundaryNodes = sideBoundaryNodes.up;
        upSideBoundaryNodes = orderSideBoundaryNodes(upSideBoundaryNodes, "UP");
        orderedBoundaryNodes = orderedBoundaryNodes.concat(upSideBoundaryNodes);

        return orderedBoundaryNodes;
    }

    // 根据边界位置获取每条边界上的节点
    var getSideBoundaryNodes = function (boundaryNodes, width, height) {
        var sideBoundaryNodes = new Object();
        var leftSideBoundaryNodes = new Array(),
			downSideBoundaryNodes = new Array(),
			rightSideBoundaryNodes = new Array(),
			upSideBoundaryNodes = new Array();
        for (var i = 0, len = boundaryNodes.length; i < len; i++) {
            var node = boundaryNodes[i];
            if (node.x === 0) leftSideBoundaryNodes.push(node);
            if (node.y === height) downSideBoundaryNodes.push(node);
            if (node.x === width) rightSideBoundaryNodes.push(node);
            if (node.y === 0) upSideBoundaryNodes.push(node);
        }
        return sideBoundaryNodes = {
            left: leftSideBoundaryNodes,
            down: downSideBoundaryNodes,
            right: rightSideBoundaryNodes,
            up: upSideBoundaryNodes
        }
    }

    // 对边界的节点逆时针排序
    var orderSideBoundaryNodes = function (sideBoundaryNodes, position) {
        var l = 0, r = sideBoundaryNodes.length - 1;
        if (position === "LEFT") {
            sideBoundaryNodes = quickSort(sideBoundaryNodes, "y", l, r);
        } else if (position === "DOWN") {
            sideBoundaryNodes = quickSort(sideBoundaryNodes, "x", l, r);
        } else if (position === "RIGHT") {
            sideBoundaryNodes = quickSort(sideBoundaryNodes, "y", l, r);
            sideBoundaryNodes.reverse();
        } else if (position === "UP") {
            sideBoundaryNodes = quickSort(sideBoundaryNodes, "x", l, r);
            sideBoundaryNodes.reverse();
        }

        return sideBoundaryNodes;
    }

    // 快速排序
    var quickSort = function (sideBoundaryNodes, attribute, l, r) {
        if (l < r) {
            var i = l, j = r, key = sideBoundaryNodes[l][attribute];
            while (i < j) {
                while (i < j && sideBoundaryNodes[j][attribute] >= key)
                    j--;
                if (i < j)
                    sideBoundaryNodes[i++][attribute] = sideBoundaryNodes[j][attribute];

                while (i < j && sideBoundaryNodes[i][attribute] < key)
                    i++;
                if (i < j)
                    sideBoundaryNodes[j--][attribute] = sideBoundaryNodes[i][attribute];
            }

            sideBoundaryNodes[i][attribute] = key;
            quickSort(sideBoundaryNodes, attribute, l, i - 1);
            quickSort(sideBoundaryNodes, attribute, i + 1, r);
        }

        return sideBoundaryNodes;
    }

    // 根据排序后的节点生成首尾相连的线段
    var getOrderedSegments = function (orderedBoundaryNodes) {
        var orderedSegments = new Array();
        for (var i = 0, len = orderedBoundaryNodes.length; i < len; i++) {
            var start = orderedBoundaryNodes[i];
            var end = (i === len - 1) ? orderedBoundaryNodes[0] : orderedBoundaryNodes[i + 1];
            if (start.x == end.x && start.y == end.y) {
                console.log("has same point");
                continue;
            }
            var segment = new Segment(start, end);
            orderedSegments.push(segment);
        }
        return orderedSegments;
    }

    // 获取所有开区间的填充区域
    var getOpenRegions = function (orderedSegments, splines) {
        for (var j = 0, len = orderedSegments.length; j < len; j++) {
            orderedSegments[j]["used"] = false;
        }

        var openRegions = new Array();
        for (var i = 0, len = orderedSegments.length; i < len; i++) {
            var segment = orderedSegments[i];
            if (segment.used) continue;
            var openRegion = new Region();
            openRegion.isOpen = true;
            traceOpenRegion(segment, orderedSegments, splines, openRegion);
            if (openRegion.points.length > 0) openRegions.push(openRegion);
        }

        return openRegions;
    }

    // 追踪开区间填充区域
    var traceOpenRegion = function (segment, orderedSegments, splines, openRegion) {

        segment.used = true; // 标记线段已用
        var start = segment.startPoint,
			end = segment.endPoint;
        openRegion.points.push(start, end);
        if (openRegion.points[0].x === end.x &&
			openRegion.points[0].y === end.y) {
            return;
        }

        var splineInfo = findSplineInfoByNode(end, splines);
        if (!splineInfo) {
            segment = findOrderedSegmentByNode(end, orderedSegments);
            traceOpenRegion(segment, orderedSegments, splines, openRegion);
        } else {
            openRegion.isobarValues.push(splineInfo.key); // 填充区域包含的等值线个数+1
            openRegion.points = openRegion.points.concat(splineInfo.points);

            end = splineInfo.endPoint;
            if (openRegion.points[0].x === end.x &&
				openRegion.points[0].y === end.y) {
                return;
            }
            segment = findOrderedSegmentByNode(end, orderedSegments);
            traceOpenRegion(segment, orderedSegments, splines, openRegion);
        }
    }

    // 根据节点查询以该节点为起点的有序线段
    var findOrderedSegmentByNode = function (node, orderedSegments) {
        for (var i = 0, len = orderedSegments.length; i < len; i++) {
            var segment = orderedSegments[i];
            var start = segment.startPoint;
            if (start.x === node.x && start.y === node.y)
                return segment;
        }
        return null;
    }

    // 根据节点查询以该节点为端点的等值线和另一端点
    var findSplineInfoByNode = function (node, splines) {
        for (var i = 0, len = splines.length; i < len; i++) {
            var spline = splines[i];
            if (spline.isOpen) {
                var points = spline.points;
                var point1 = points[0],
					point2 = points[points.length - 1];
                point1 = new IsoPoint(point1.x, point1.y, point1.inBoundary);
                point2 = new IsoPoint(point2.x, point2.y, point2.inBoundary);
                var sequencePoints = null;
                if (point1.x === node.x && point1.y === node.y) {
                    sequencePoints = getSequencePoints(points, false);
                    return { "endPoint": point2, "points": sequencePoints, "key": spline.key };
                } else if (point2.x === node.x && point2.y === node.y) {
                    sequencePoints = getSequencePoints(points, true);
                    return { "endPoint": point1, "points": sequencePoints, "key": spline.key };
                }
            }
        }
        return null;
    }

    // 获取等值线上的序列点
    var getSequencePoints = function (points, reverse) {
        var sequencePoints = new Array();
        var len = points.length;
        if (reverse) {
            for (var i = len - 2; i >= 0; i--) {
                var pt = points[i];
                sequencePoints.push(new IsoPoint(pt.x, pt.y, pt.inBoundary));
            }
        } else {
            for (var j = 1; j < len; j++) {
                var pt = points[j];
                sequencePoints.push(new IsoPoint(pt.x, pt.y, pt.inBoundary));
            }
        }

        return sequencePoints;
    }

    // 获取闭合区域
    var getClosedRegions = function (splines) {
        var closedRegions = new Array();
        var closedSplines = new Array();
        for (var i = 0, len = splines.length; i < len; i++) {
            var spline = splines[i];
            if (!spline.isOpen) {
                var clone = cloneSpline(spline);
                closedSplines.push(clone);
            }
        }
        if (closedSplines.length == 0) return closedRegions;

        var minXs = new Array();
        for (var j = 0, len = closedSplines.length; j < len; j++) {
            var closedSpline = closedSplines[j];
            var spline_points = closedSpline.points;
            var minX = getMiniX(spline_points);
            closedSpline["minX"] = minX;
            minXs.push(minX);
        }

        quickSort2(minXs, 0, minXs.length - 1);
        for (var k = 0, len = minXs.length; k < len; k++) {
            var closedSpline = getClosedSplineByMinX(minXs[k], closedSplines);
            var closedRegion = new Region(closedSpline.points, false, [closedSpline.key]);
            closedRegions.push(closedRegion);
        }

        return closedRegions;
    }

    // 复制spline对象
    var cloneSpline = function (spline) {
        var clone = new Spline();
        clone.key = spline.key;
        clone.isOpen = spline.isOpen;
        clone.points = new Array();
        for (var i = 0, len = spline.points.length; i < len; i++) {
            var pt = spline.points[i];
            clone.points.push(new IsoPoint(pt.x, pt.y, pt.inBoundary));
        };
        return clone;
    }

    // 数字的快速排序
    var quickSort2 = function (array, l, r) {
        if (l < r) {
            var i = l, j = r, key = array[l];
            while (i < j) {
                while (i < j && array[j] >= key)
                    j--;
                if (i < j)
                    array[i++] = array[j];

                while (i < j && array[i] < key)
                    i++;
                if (i < j)
                    array[j--] = array[i];
            }

            array[i] = key;
            quickSort2(array, l, i - 1);
            quickSort2(array, i + 1, r);
        }
    }

    // 获取等值线中的最小x值
    var getMiniX = function (points) {
        var minX = points[0].x;
        for (var i = 1, len = points.length; i < len; i++) {
            var x = points[i].x;
            if (x < minX) {
                minX = x;
            }
        }
        return minX;
    }

    var getClosedSplineByMinX = function (minX, closedSplines) {
        for (var i = 0, len = closedSplines.length; i < len; i++) {
            var closedSpline = closedSplines[i];
            if (closedSpline.minX === minX)
                return closedSpline;
        }
        return null;
    }

    var fillRegion = function (region, context, color) {
        var line = region.points;
        context.beginPath();
        context.moveTo(line[0].x, line[0].y);
        for (var m = 1; m < line.length; m++) {
            context.lineTo(line[m].x, line[m].y);
        }
        context.fillStyle = color;
        context.fill();
    }

    //绘制网格
    Isobar.prototype.drawGrid = function (row, col, points, width, height, counterValues, xyRange, radius) {
        GridData = {};
        GridData = createGrid_MAP(points, row, col, width, height, counterValues, xyRange, radius, // 网格点插值的半径
                             this.limitePointCount); // 网格点插值的最大计算数
        return GridData;
    }
    //绘制等值线
    Isobar.prototype.drawlines = function (row, col, points, width, height, counterValues, xyRange, radius) {
        /*--------------------------- 等值线前需画网格的方法 ----------------------------*/
        //var data = [];
        //if (GridData && GridData.dataValue) {
        //    data = GridData.dataValue;
        //}
        //else {
        //    GridData = createGrid_MAP(points, row, col, width, height, counterValues, xyRange, radius, // 网格点插值的半径
        //                     this.limitePointCount); // 网格点插值的最大计算数
        //    data = GridData.dataValue;
        //}
        /*--------------------------- 直接画等值线的方法 ----------------------------*/
        var data = createGrid(points, row, col, width, height, counterValues, xyRange, radius, // 网格点插值的半径
                             this.limitePointCount); // 网格点插值的最大计算数
        var X = new Array(5),
			Y = new Array(5),
			V = new Array(5);

        this.contourLines = null;
        for (var i = 0; i < row - 1; i++) {
            for (var j = 0; j < col - 1; j++) {
                //设置网格四个角坐标和属性值
                X[0] = i;
                Y[0] = j;
                V[0] = data[i][j];
                X[1] = i + 1;
                Y[1] = j;
                V[1] = data[i + 1][j];
                X[2] = i + 1;
                Y[2] = j + 1;
                V[2] = data[i + 1][j + 1];
                X[3] = i;
                Y[3] = j + 1;
                V[3] = data[i][j + 1];
                //网格中心点坐标和属性值
                X[4] = 0.5 * (X[0] + X[1]);
                Y[4] = 0.5 * (Y[1] + Y[2]);
                V[4] = 0.25 * (V[0] + V[1] + V[2] + V[3]);

                var n3 = 4; //网格中心点下标
                for (var n = 0; n < 4; n++) {
                    var n2 = n + 1;
                    if (n == 3) n2 = 0;
                    var order = reorder(n, n2, n3, V);
                    var small = order[0],
						medium = order[1],
						large = order[2];

                    for (var line = 0, contourData = counterValues; line < contourData.length; line++) {
                        var target = contourData[line];
                        if (V[small] < target && target < V[large]) {
                            var x1 = interp(X[small], V[small], X[large], V[large], target);
                            var y1 = interp(Y[small], V[small], Y[large], V[large], target);
                            var x2, y2;
                            if (target > V[medium]) {
                                x2 = interp(X[medium], V[medium], X[large], V[large], target);
                                y2 = interp(Y[medium], V[medium], Y[large], V[large], target);
                            }
                            else {
                                x2 = interp(X[small], V[small], X[medium], V[medium], target);
                                y2 = interp(Y[small], V[small], Y[medium], V[medium], target);
                            }

                            var rx1 = round(x1, width, col - 1),
                            	ry1 = round(y1, height, row - 1),
                            	rx2 = round(x2, width, col - 1),
                            	ry2 = round(y2, height, row - 1);
                            if (rx1 === rx2 && ry1 === ry2) continue;

                            rx1 += xyRange.xMin;
                            rx2 += xyRange.xMin;
                            ry1 += xyRange.yMin;
                            ry2 += xyRange.yMin;

                            var point1 = new IsoPoint(rx1, ry1);
                            if (rx1 == xyRange.xMin || ry1 == xyRange.yMin ||
                            	rx1 == xyRange.xMax || ry1 == xyRange.yMax) {
                                point1.inBoundary = true;
                            }
                            var point2 = new IsoPoint(rx2, ry2);
                            if (rx2 == xyRange.xMin || ry2 == xyRange.yMin ||
                            	rx2 == xyRange.xMax || ry2 == xyRange.yMax) {
                                point2.inBoundary = true;
                            }
                            var segment = new Segment(point1, point2);

                            // 以等值值为key的等值线段的集合对象
                            this.contourLines = this.contourLines || new Object();
                            if (!this.contourLines[target]) {
                                this.contourLines[target] = new Array();
                                this.contourLines[target].push(segment);
                            } else {
                                this.contourLines[target].push(segment);
                            }
                        }
                    }

                }
            }
        }

        var splines = GetSeperateLines(this.contourLines);
        return splines;
        //var ctx = this.context;
        //ctx.globalAlpha = 1; // 不透明
        //ctx.clearRect(0, 0, this.width, this.height);
        //for (var k = 0, len = splines.length; k < len; k++) {
        //    var spline = splines[k];
        //    var color = getColor(spline.key, this.colorLevels);
        //    drawLine(spline.points, color, ctx);
        //    drawLabel(spline.points, spline.key, ctx);
        //}

        //this.splines = splines;
        //this.hasDraw = true;
    }

    //平滑处理
    Isobar.prototype.smooth = function () {
        //if(!this.hasDraw)
        //	throw 'you have not drawn Isobar lines.'

        //if(!this.splines)
        //	throw 'no contourLines found.'

        var splines = this.splines;
        var ctx = this.context;
        ctx.globalAlpha = 1; // 不透明
        ctx.clearRect(0, 0, this.width, this.height);
        for (var k = 0, len = splines.length; k < len; k++) {
            var spline = splines[k];
            spline.points = smoothLine(spline.points, this.smoothTimes, this.smoothEquant);
            //var color = getColor(spline.key, this.colorLevels);
            //drawLine(spline.points, color, ctx);
            //drawLabel(spline.points, spline.key, ctx);
        }
    }

    // 区域填充
    Isobar.prototype.fill = function () {
        //if(!this.hasDraw)
        //	throw 'you have not drawn Isobar lines.'

        //if(!this.splines || this.splines.length == 0)
        //	throw 'no contourLines found.'

        //var context = this.context;
        //context.globalAlpha = this.opacity;
        //context.clearRect(0,0,this.width,this.height);
        //var width = context.canvas.width,
        //	height = context.canvas.height;
        var boundaryNodes = getBoundaryNodes(this.splines);
        var orderedBoundaryNodes = counterClock(boundaryNodes, width, height);
        var orderedSegments = getOrderedSegments(orderedBoundaryNodes);
        var openRegions = getOpenRegions(orderedSegments, this.splines);
        var closedRegions = getClosedRegions(this.splines);
        for (var i = 0, len = openRegions.length; i < len; i++) {
            var region = openRegions[i];
            var color = null;
            if (region.isobarValues.length == 0) {
                color = "#ffffff";
            } else {
                var avg = average(region.isobarValues);
                color = getColor(avg, this.colorLevels);
            }

            fillRegion(region, this.context, color);
        };
        for (var j = 0, len = closedRegions.length; j < len; j++) {
            var closedRegion = closedRegions[j];
            var key = closedRegion.isobarValues[0];
            var color = getColor(key, this.colorLevels);
            fillRegion(closedRegion, this.context, color);
        }
    }

    root.Isobar = window.Isobar = Isobar;

})(this);
