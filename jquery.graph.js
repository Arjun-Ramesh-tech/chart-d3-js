(function ($) {

    $.fn.thermoChart = function (options) {
      var $parent = $(this)[0];
      var data;
      var settings;
      var tooltiplocation;
  
      var width = function width(margin) {
        var w = parseInt(d3.select($parent).style("width")) - 20;
        return ((w - margin.left - margin.right - 20) < 0) ? margin.left + margin.right + 2 : w;
      };
      var height = function height(margin) {
        var h = parseInt(d3.select($parent).style("height")) - 20;
        return (h - margin.top - margin.bottom - 20 < 0) ?
          margin.top + margin.bottom + 2 : h;
      };
  
      //d3line
      var drawGraph = function () {
        var margin = { top: 10, right: 0, bottom: 0, left: 0 };
        var width = 960, height = 500;
        var dotRadius = function () { return 2.5 };
        var color = settings.color;
        var id = Math.floor(Math.random() * 10000); //Create semi-unique ID incase user doesn't select one
        var x, y;
        var dispatch = d3.dispatch("pointMouseover", "pointMouseout");
        var x0, y2;
        x = d3.scale.linear();
        y = settings["ylog"] ? d3.scale.log() : d3.scale.linear();
  
        var setAxesRange = function (seriesData) {
          switch (settings["orientation"]) {
            case "bottom-left":
              x.domain(d3.extent(d3.merge(seriesData), function (d) { return d[0] }))
                .range([0, width - margin.left - margin.right]);
  
              y.domain(d3.extent(d3.merge(seriesData), function (d) { return d[1] }))
                .range([height - margin.top - margin.bottom, 0]);
              break;
            case "top-left":
              x.domain(d3.extent(d3.merge(seriesData), function (d) { return d[0] }))
                .range([0, width - margin.left - margin.right]);
  
              y.domain(d3.extent(d3.merge(seriesData), function (d) { return d[1] }))
                .range([0, height - margin.top - margin.bottom]);
              break;
            case "bottom-right":
              x.domain(d3.extent(d3.merge(seriesData), function (d) { return d[0] }))
                .range([width - margin.left - margin.right, 0]);
              y.domain(d3.extent(d3.merge(seriesData), function (d) { return d[1] }))
                .range([height - margin.top - margin.bottom, 0]);
  
              break;
            case "top-right":
              x.domain(d3.extent(d3.merge(seriesData), function (d) { return d[0] }))
                .range([width - margin.left - margin.right, 0]);
              y.domain(d3.extent(d3.merge(seriesData), function (d) { return d[1] }))
                .range([0, height - margin.top - margin.bottom]);
              break;
          }
        };
  
        var mergeData = function (data) {
          var vertices = d3.merge(data.map(function (line, lineIndex) {
              return line.data.map(function (point, pointIndex) {
                var pointKey = line.label + '-' + point[0];
                return [x(point[0]), y(point[1]), lineIndex, pointIndex]; //adding series index to point because data is being flattened
              })
            })
          );
          vertices.sort(function (a, b) {
            return a[0] - b[0] || a[1] - b[1]
          });
  
          if (vertices.length > 1) {
            // To store index of next unique element
            var j = 0;
            // Just maintaining another updated index i.e. j
            for (var i = 0; i < vertices.length - 1; i++)
              if ((vertices[i][0] != vertices[i + 1][0]) || (vertices[i][1] != vertices[i + 1][1]))
                vertices[j++] = vertices[i];
  
            vertices[j++] = vertices[vertices.length - 1];
            vertices.length = j;
          }
          return vertices;
        };
  
        var translateGraphArea = function (wrap) {
          var gEnter = wrap.enter().append('g').attr('class', 'd3line').append('g');
          gEnter.append('g').attr('class', 'lines');
          gEnter.append('g').attr('class', 'point-clips');
          gEnter.append('g').attr('class', 'point-paths');
          switch (settings["orientation"]) {
            case "top-right":
              var g = wrap.select('g')
                .attr('transform', 'translate(' + margin.left + ',' + 10 + ')');
              break;
            case "top-left":
              var g = wrap.select('g')
                .attr('transform', 'translate(' + margin.left + ',' + 10 + ')');
              break;
            case "bottom-left":
              var g = wrap.select('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            case "bottom-right":
              var g = wrap.select('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
              break;
          };
          gEnter.append('g').attr('class', 'voronoi-clip')
            .append('clipPath')
            .attr('id', 'voronoi-clip-path-' + id) //this id should probably be set on update, unless ID is always set before render
            .append('rect');
          wrap.select('.voronoi-clip rect')
            .attr('x', -10)
            .attr('y', -10)
            .attr('width', width - margin.left - margin.right + 20)
            .attr('height', height - margin.top - margin.bottom + 20);
          wrap.select('.point-paths')
            .attr('clip-path', 'url(#voronoi-clip-path-' + id + ')');
        };
  
        var plotClipPaths = function (wrap, vertices) {
          var pointClips = wrap.select('.point-clips').selectAll('.clip-path')
            .data(vertices);
          pointClips.enter().append('clipPath').attr('class', 'clip-path')
            .append('circle')
            .attr('r', 25);
          pointClips.exit().remove();
          pointClips
            .attr('id', function (d, i) { return 'clip-' + id + '-' + d[2] + '-' + d[3] })
            .attr('transform', function (d) { return 'translate(' + d[0] + ',' + d[1] + ')' });
  
          var voronoi = d3.geom.voronoi(vertices).map(function (d, i) {
            return { 'data': d, 'series': vertices[i][2], 'point': vertices[i][3] }
          });
  
          //TODO: Add very small amount of noise to prevent duplicates
          var pointPaths = wrap.select('.point-paths').selectAll('path')
            .data(voronoi);
          pointPaths.enter().append('path')
            .attr('class', function (d, i) { return 'path-' + i; });
          pointPaths.exit().remove();
          pointPaths
            .attr('clip-path', function (d) { return 'url(#clip-' + id + '-' + d.series + '-' + d.point + ')'; })
            .attr('d', function (d) { return 'M' + d.data.join(',') + 'Z'; })
            .on('mouseover', function (d) {
              dispatch.pointMouseover({
                point: data[d.series].data[d.point],
                series: data[d.series],
                pos: [x(data[d.series].data[d.point][0]) + margin.left, y(data[d.series].data[d.point][1]) + margin.top],
                pointIndex: d.point,
                seriesIndex: d.series
              });
            })
            .on('mouseout', function (d) {
              dispatch.pointMouseout({
                point: d,
                series: data[d.series],
                pointIndex: d.point,
                seriesIndex: d.series
              });
            });
          dispatch.on('pointMouseover.point', function (d) {
            wrap.select('.line-' + d.seriesIndex + ' .point-' + d.pointIndex)
              .classed('hover', true);
          });
  
          dispatch.on('pointMouseout.point', function (d) {
            wrap.select('.line-' + d.seriesIndex + ' .point-' + d.pointIndex)
              .classed('hover', false);
          });
        };
  
        var setLineParams = function (wrap) {
          var lines = wrap.select('.lines').selectAll('.line')
            .data(function (d) { return d }, function (d) { return d.label });
          lines.enter().append('g')
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1).style("fill", function (d, i) { if (d.type == "Area") { return color[i] } else { return "none" } });
          d3.transition(lines.exit())
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1)
            .remove();
          lines.attr('class', function (d, i) { return 'line line-' + i })
            .classed('hover', function (d) { return d.hover })
            .style('stroke', function (d, i) { return color[i] })
          d3.transition(lines)
            .style('stroke-opacity', 1)
            .style('fill-opacity', .5);
          return lines;
        };
  
        var filterAndPlotLine = function (lines) {
          var paths = lines.selectAll('path')
            .data(function (d, i) { if (d.type == "Line") { return [d.data]; } else { return false } });
          paths.enter().append('path')
            .attr('d', d3.svg.line()
              .x(function (d) { return x0(d[0]) })
              .y(function (d) { return y2(d[1]) }).interpolate(settings["interpolate"])
            );
          paths.exit().remove();
          d3.transition(paths)
            .attr('d', d3.svg.line()
              .x(function (d) { return x(d[0]) })
              .y(function (d) { return y(d[1]) }).interpolate(settings["interpolate"])
            );
        };
  
        var filterAndPlotArea = function (lines) {
          var arealine1 = d3.svg.area()
            .x(function (d, i) { return x0(d[0]); })
            .y(function (d) { return y2(d[1]); }).x0(0)
  
          var areapath = lines.selectAll('path')
            .data(function (d, i) { if (d.type == "Area") { return [d.data]; } else { return false } });
  
          areapath.enter().append('path')
            .attr('d', arealine1)
  
          areapath.exit().remove();
  
          d3.transition(areapath)
            .attr('d', arealine1)
  
        };
  
        var filterAndPlotScatter = function (lines) {
            console.log(lines);

          var points = lines.selectAll('circle.point')
            .data(function (d) { if (d.type == "Scatter" || d.hover == true) { return d.data } else { return false; } });
          points.enter().append('circle')
            .attr('cx', function (d) { return x0(d[0]) })
            .attr('cy', function (d) { return y2(d[1]) });
          points.exit().remove();
          points.attr('class', function (d, i) { return 'point point-' + i });
          d3.transition(points)
            .attr('cx', function (d) { return x(d[0]) })
            .attr('cy', function (d) { return y(d[1]) })
            .attr('r', dotRadius());
        };
  
        var chart = function (selection) {
          selection.each(function (data) {
            var seriesData = data.map(function (d) { return d.data });
            var wrap = d3.select(this).selectAll('g.d3line').data([data]);
  
            x0 = x0 || x;
            y2 = y2 || y;
  
            //TODO: reconsider points {x: #, y: #} instead of [x,y]
            //TODO: data accessors so above won't really matter, but need to decide for internal use
  
            //add series data to each point for future ease of use
            data = data.map(function (series, i) {
              series.data = series.data.map(function (point) {
                point.series = i;
                return point;
              });
              return series;
            });
            setAxesRange(seriesData);
            var vertices = mergeData(data);
            translateGraphArea(wrap);
            plotClipPaths(wrap, vertices);
            var lines = setLineParams(wrap);
            filterAndPlotLine(lines);
            filterAndPlotArea(lines);
            filterAndPlotScatter(lines);
  
  
          });
          x0 = x;
          y2 = y;
          return chart;
        };
  
        chart.dispatch = dispatch;
  
        chart.margin = function (_) {
          if (!arguments.length) return margin;
          margin = _;
          return chart;
        };
        chart.width = function (_) {
          if (!arguments.length) return width;
          width = _;
          return chart;
        };
        chart.height = function (_) {
          if (!arguments.length) return height;
          height = _;
          return chart;
        };
        chart.dotRadius = function (_) {
          if (!arguments.length) return dotRadius;
          dotRadius = d3.functor(_);
          return chart;
        };
        chart.color = function (_) {
          if (!arguments.length) return color;
          color = _;
          return chart;
        };
        chart.id = function (_) {
          if (!arguments.length) return id;
          id = _;
          return chart;
        };
        return chart;
      };
  
      //d3lineWithLegend
      var draw = function () {
        var margin = { top: 40, right: 60, bottom: 40, left: 60 };
        var width = 960, height = 500;
        var dotRadius = function () { return 2.5 };
        var xAxisLabelText = false, yAxisLabelText = false;
        var color = settings.color;
        var dispatch = d3.dispatch('showTooltip', 'hideTooltip');
        var x, y;
        var xAxis, yAxis;
        var legend = plotLegends().height(30).color(color);
        var graph = drawGraph();
        y = settings["ylog"] ? d3.scale.log() : d3.scale.linear();
        x = d3.scale.linear();
        switch (settings["orientation"]) {
          case "bottom-left":
            xAxis = d3.svg.axis().scale(x).orient('bottom');
            yAxis = d3.svg.axis().scale(y).orient('left');
            break;
          case "bottom-right":
            xAxis = d3.svg.axis().scale(x).orient('bottom');
            yAxis = d3.svg.axis().scale(y).orient('right');
            break;
          case "top-left":
            xAxis = d3.svg.axis().scale(x).orient('top');
            yAxis = d3.svg.axis().scale(y).orient('left');
            break;
          case "top-right":
            xAxis = d3.svg.axis().scale(x).orient('top');
            yAxis = d3.svg.axis().scale(y).orient('right');
            break;
        }
  
        var setTicks = function () {
          if (settings["hasXTicks"] == false) {
            xAxis
              .ticks(width / 200)
              .tickSize(-(height - margin.top - margin.bottom), 0);
          }
          else {
            xAxis
              .tickValues(settings["xTicks"])
              .tickSize(-(height - margin.top - margin.bottom), 0);
          }
          if (settings["hasYTicks"] == false) {
            yAxis
              .ticks(height / 72)
              .tickSize(-(width - margin.right - margin.left), 0);
          }
          else {
            yAxis
              .tickValues(settings["yTicks"])
              .tickSize(-(width - margin.right - margin.left), 0);
          }
        };
  
        var handleLegendsDispatch = function (selection) {
          legend.dispatch.on('legendClick', function (d, i) {
            d.disabled = !d.disabled;
  
            if (!data.filter(function (d) { return !d.disabled }).length) {
              data.forEach(function (d) {
                d.disabled = false;
              });
            }
  
            selection.transition().call(chart)
          });
  
  
          legend.dispatch.on('legendMouseover', function (d, i) {
            d.hover = true;
            selection.transition().call(chart)
          });
  
          legend.dispatch.on('legendMouseout', function (d, i) {
            d.hover = false;
            selection.transition().call(chart)
          });
        };
  
  
        var handleGraphMouseDispatch = function () {
          graph.dispatch.on('pointMouseover.tooltip', function (e) {
            dispatch.showTooltip({
              point: e.point,
              series: e.series,
              pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
              seriesIndex: e.seriesIndex,
              pointIndex: e.pointIndex
            });
          });
  
          graph.dispatch.on('pointMouseout.tooltip', function (e) {
            dispatch.hideTooltip(e);
          });
        };
  
  
        var handleLegends = function (wrap) {
          legend
            .color(color)
            .width(width / 2 - margin.right);
  
          switch (settings["orientation"]) {
            case "bottom-left":
              wrap.select('.legendWrap')
                .datum(data)
                .attr('transform', 'translate(' + (width / 2 - margin.left) + ',' + (-legend.height()) + ')')
                .call(legend);
              break;
            case "top-left":
              wrap.select('.legendWrap')
                .datum(data)
                .attr('transform', 'translate(' + (width / 2 - margin.left) + ',' + (height - legend.height() - margin.bottom + 10) + ')')
                .call(legend);
              break;
            case "bottom-right":
              wrap.select('.legendWrap')
                .datum(data)
                .attr('transform', 'translate(' + (0) + ',' + (-legend.height()) + ')')
                .call(legend);
              break;
            case "top-right":
              wrap.select('.legendWrap')
                .datum(data)
                .attr('transform', 'translate(' + (0) + ',' + (height - legend.height() - margin.bottom + 20) + ')')
                .call(legend);
              break;
          }
          //TODO: maybe margins should be adjusted based on what components are used: axes, axis labels, legend
          margin.top = legend.height();  //need to re-render to see update
  
        };
  
        var plotAxes = function (g) {
          var xAxisLabel = g.select('.x.axis').selectAll('text.axislabel')
            .data([xAxisLabelText || null]);
  
          switch (settings["orientation"]) {
            case "bottom-left":
              xAxisLabel.enter().append('text').attr('class', 'axislabel')
                .attr('text-anchor', 'middle')
                .attr('x', x.range()[1] / 2)
                .attr('y', margin.bottom);
              xAxisLabel.exit().remove();
              xAxisLabel.text(function (d) {return d });
              g.select('.x.axis')
                .attr('transform', 'translate(0,' + y.range()[0] + ')')
                .call(xAxis)
                .selectAll('line.tick')
                .filter(function (d) { return !d })
                .classed('zero', true);
  
              break;
            case "bottom-right":
              xAxisLabel.enter().append('text').attr('class', 'axislabel')
                .attr('text-anchor', 'middle')
                .attr('x', x.range()[0] / 2)
                .attr('y', margin.bottom);
              xAxisLabel.exit().remove();
              xAxisLabel.text(function (d) { return d });
              g.select('.x.axis')
                .attr('transform', 'translate(0,' + y.range()[0] + ')')
                .call(xAxis)
                .selectAll('line.tick')
                .filter(function (d) { return !d })
                .classed('zero', true);
  
              break;
            case "top-left":
              xAxisLabel.enter().append('text').attr('class', 'axislabel')
                .attr('text-anchor', 'middle')
                .attr('x', x.range()[1] / 2)
                .attr('y', (-margin.bottom / 2) - 5);
              xAxisLabel.exit().remove();
              xAxisLabel.text(function (d) { return d });
              g.select('.x.axis')
                .attr('transform', 'translate(0,10)')
                .call(xAxis)
                .selectAll('line.tick')
                .filter(function (d) { return !d })
                .classed('zero', true);
              break;
            case "top-right":
              xAxisLabel.enter().append('text').attr('class', 'axislabel')
                .attr('text-anchor', 'middle')
                .attr('x', x.range()[0] / 2)
                .attr('y', (-margin.bottom / 2) - 5);
              xAxisLabel.exit().remove();
              xAxisLabel.text(function (d) { return d });
              g.select('.x.axis')
                .attr('transform', 'translate(0,10)')
                .call(xAxis)
                .selectAll('line.tick')
                .filter(function (d) { return !d })
                .classed('zero', true);
              break;
          }
  
          var yAxisLabel = g.select('.y.axis').selectAll('text.axislabel')
            .data([yAxisLabelText || null]);
  
          switch (settings["orientation"]) {
            case "bottom-left":
              yAxisLabel.enter().append('text').attr('class', 'axislabel')
                .attr('transform', 'rotate(-90)')
                .attr('text-anchor', 'middle')
                .attr('y', 20 - margin.left);
              yAxisLabel.exit().remove();
              yAxisLabel
                .attr('x', -y.range()[0] / 2)
                .text(function (d) { return d });
  
              g.select('.y.axis')
                .call(yAxis)
                .selectAll('line.tick')
                .filter(function (d) { return !d })
                .classed('zero', true);
              break;
            case "top-left":
              yAxisLabel.enter().append('text').attr('class', 'axislabel')
                .attr('transform', 'rotate(-90)')
                .attr('text-anchor', 'middle')
                .attr('y', 20 - margin.left);
              yAxisLabel.exit().remove();
              yAxisLabel
                .attr('x', -y.range()[1] / 2)
                .text(function (d) { return d });
  
              g.select('.y.axis')
                .attr('transform', 'translate(0,' + (10) + ')')
                .call(yAxis)
                .selectAll('line.tick')
                .filter(function (d) { return !d })
                .classed('zero', true);
              break;
            case "bottom-right":
              yAxisLabel.enter().append('text').attr('class', 'axislabel')
                .attr('transform', 'rotate(-90)')
                .attr('text-anchor', 'middle')
                .attr('y', 10 + margin.left / 2);
              yAxisLabel.exit().remove();
              yAxisLabel
                .attr('x', (-y.range()[0] / 2))
                .text(function (d) { return d });
  
              g.select('.y.axis')
                .attr('transform', 'translate(' + (width - margin.left - margin.right) + ',0)')
                .call(yAxis)
                .selectAll('line.tick')
                .filter(function (d) { return !d })
                .classed('zero', true);
              break;
            case "top-right":
              yAxisLabel.enter().append('text').attr('class', 'axislabel')
                .attr('transform', 'rotate(-90)')
                .attr('text-anchor', 'middle')
                .attr('y', 10 + margin.left / 2);
              yAxisLabel.exit().remove();
              yAxisLabel
                .attr('x', -y.range()[1] / 2)
                .text(function (d) { return d });
  
              g.select('.y.axis')
                .attr('transform', 'translate(' + (width - margin.left - margin.right) + ',10)')
                .call(yAxis)
                .selectAll('line.tick')
                .filter(function (d) { return !d })
                .classed('zero', true);
              break;
          }
  
        };
  
  
        function chart(selection) {
          selection.each(function (data) {
            var wrap = d3.select(this).selectAll('g.wrap').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'wrap d3lineWithLegend').append('g');
            var series = data.filter(function (d) { return !d.disabled })
              .map(function (d) { return d.data });
            gEnter.append('g').attr('class', 'legendWrap');
            gEnter.append('g').attr('class', 'x axis');
            gEnter.append('g').attr('class', 'y axis');
            gEnter.append('g').attr('class', 'linesWrap');
            switch (settings["orientation"]) {
              case "bottom-left":
                x.domain(d3.extent(d3.merge(series), function (d) { return d[0] }))
                  .range([0, width - margin.left - margin.right]);
  
                y.domain(d3.extent(d3.merge(series), function (d) { return d[1] }))
                  .range([height - margin.top - margin.bottom, 0]);
                break;
              case "top-left":
                x.domain(d3.extent(d3.merge(series), function (d) { return d[0] }))
                  .range([0, width - margin.left - margin.right]);
  
                y.domain(d3.extent(d3.merge(series), function (d) { return d[1] }))
                  .range([0, height - margin.top - margin.bottom]);
                break;
              case "bottom-right":
                x.domain(d3.extent(d3.merge(series), function (d) { return d[0] }))
                  .range([width - margin.left - margin.right, 0]);
                y.domain(d3.extent(d3.merge(series), function (d) { return d[1] }))
                  .range([height - margin.top - margin.bottom, 0]);
  
                break;
              case "top-right":
                x.domain(d3.extent(d3.merge(series), function (d) { return d[0] }))
                  .range([width - margin.left - margin.right, 0]);
                y.domain(d3.extent(d3.merge(series), function (d) { return d[1] }))
                  .range([0, height - margin.top - margin.bottom]);
                break;
            }
  
            graph
              .width(width - margin.left - margin.right)
              .height(height - margin.top - margin.bottom)
              .color(data.map(function (d, i) {
                return d.color || color[i % 10];
              }).filter(function (d, i) { return !data[i].disabled }));
            setTicks();
            handleLegendsDispatch(selection);
            handleGraphMouseDispatch();
            handleLegends(wrap);
            var g = wrap.select('g')
              .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            var graphWrap = wrap.select('.linesWrap')
              .datum(data.filter(function (d) { return !d.disabled }));
            d3.transition(graphWrap).call(graph);
            plotAxes(g);
          });
          return chart;
        }
  
        chart.dispatch = dispatch;
  
        chart.margin = function (_) {
          if (!arguments.length) return margin;
          margin = _;
          return chart;
        };
  
        chart.width = function (_) {
          if (!arguments.length) return width;
          width = _;
          return chart;
        };
  
        chart.height = function (_) {
          if (!arguments.length) return height;
          height = _;
          return chart;
        };
  
        chart.color = function (_) {
          if (!arguments.length) return color;
          color = _;
          return chart;
        };
  
        chart.dotRadius = function (_) {
          if (!arguments.length) return dotRadius;
          dotRadius = d3.functor(_);
          graph.dotRadius = d3.functor(_);
          return chart;
        };
  
        //TODO: consider directly exposing both axes
        //chart.xAxis = xAxis;
  
        //Expose the x-axis' tickFormat method.
        chart.xAxis = {};
        d3.rebind(chart.xAxis, xAxis, 'tickFormat');
  
        chart.xAxis.label = function (_) {
          if (!arguments.length) return xAxisLabelText;
          xAxisLabelText = _;
          return chart;
        }
  
        // Expose the y-axis' tickFormat method.
        //chart.yAxis = yAxis;
  
        chart.yAxis = {};
        d3.rebind(chart.yAxis, yAxis, 'tickFormat');
  
        chart.yAxis.label = function (_) {
          if (!arguments.length) return yAxisLabelText;
          yAxisLabelText = _;
          return chart;
        }
        return chart;
      };
  
      var plotLegends = function () {
        var margin = { top: 5, right: 5, bottom: 5, left: 10 },
          width = 400,
          height = 20,
          color = settings.color,
          dispatch = d3.dispatch('legendClick', 'legendMouseover', 'legendMouseout');
        var g;
  
        var drawLegend = function (data,LegendPlacement) {
          var wrap = d3.select(LegendPlacement).selectAll('g.legend').data([data]);
          var gEnter = wrap.enter().append('g').attr('class', 'legend').append('g');
  
          g = wrap.select('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
  
          var series = g.selectAll('.series')
            .data(function (d) { return d });
  
          var seriesEnter = series.enter().append('g').attr('class', 'series')
            .on('click', function (d, i) {
              dispatch.legendClick(d, i);
            })
            .on('mouseover', function (d, i) {
              dispatch.legendMouseover(d, i);
            })
            .on('mouseout', function (d, i) {
              dispatch.legendMouseout(d, i);
            });
          seriesEnter.append('circle')
            .style('fill', function (d, i) { return d.color || color[i % 10] })
            .style('stroke', function (d, i) { return d.color || color[i % 10] })
            .attr('r', 5);
          seriesEnter.append('text')
            .text(function (d) { return d.label })
            .attr('text-anchor', 'start')
            .attr('dy', '.32em')
            .attr('dx', '8');
          series.classed('disabled', function (d) { return d.disabled });
          series.exit().remove();
          return series;
  
        };
  
        var transformLegend = function (series,g) {
          var ypos = 5,
            newxpos = 5,
            maxwidth = 0,
            xpos;
          series
            .attr('transform', function (d, i) {
              var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
              xpos = newxpos;
  
              //TODO: 1) Make sure dot + text of every series fits horizontally, or clip text to fix
              //      2) Consider making columns in line so dots line up
              //         --all labels same width? or just all in the same column?
              //         --optional, or forced always?
              if (width < margin.left + margin.right + xpos + length) {
                newxpos = xpos = 5;
                ypos += 20;
              }
  
              newxpos += length;
              if (newxpos > maxwidth) maxwidth = newxpos;
  
              return 'translate(' + xpos + ',' + ypos + ')';
            });
          switch (settings["orientation"]) {
            case "bottom-left":
              g.attr('transform', 'translate(' + (width - margin.right - maxwidth) + ',' + margin.top + ')');
              break;
            case "top-left":
              g.attr('transform', 'translate(' + (width - margin.right - maxwidth) + ',' + margin.top + ')');
              break;
            case "bottom-right":
              g.attr('transform', 'translate(' + (margin.left) + ',' + margin.top + ')');
              break;
            case "top-right":
              g.attr('transform', 'translate(' + (margin.left) + ',' + margin.top + ')');
              break;
          }
  
          height = margin.top + margin.bottom + ypos + 15;
  
        };
  
        function legend(selection) {
          selection.each(function (data) {
            var LegendPlacement=this;
            var series = drawLegend(data,LegendPlacement);
            transformLegend(series,g);
          });
          return legend;
        }
        legend.dispatch = dispatch;
  
        legend.margin = function (_) {
          if (!arguments.length) return margin;
          margin = _;
          return legend;
        };
  
        legend.width = function (_) {
          if (!arguments.length) return width;
          width = _;
          return legend;
        };
  
        legend.height = function (_) {
          if (!arguments.length) return height;
          height = _;
          return legend;
        };
  
        legend.color = function (_) {
          if (!arguments.length) return color;
          color = _;
          return legend;
        };
  
        return legend;
  
      };
  
      var handleTicks = function () {
        var x, y;
        //Checking For Orientation Accordingly Tick Generation
        if ((settings["orientation"] == "bottom-left") || (settings["orientation"] == "bottom-right") || (settings["orientation"] == "top-left") || (settings["orientation"] == "top-right")) {
          x = width({ top: 30, right: 10, bottom: 50, left: 60 }) / 200;
          y = height({ top: 30, right: 10, bottom: 50, left: 60 }) / 72;
          x = x.toFixed(2);
          y = y.toFixed(2)
        }
        else {
          x = height({ top: 30, right: 10, bottom: 50, left: 60 }) / 72;
          y = width({ top: 30, right: 10, bottom: 50, left: 60 }) / 200;
          x = x.toFixed(2);
          y = y.toFixed(2);
        }
  
        if ((settings.hasOwnProperty('xTicks')) && (Array.isArray(settings["xTicks"]))) {
          settings.hasXTicks = true;
        }
        else if (settings.hasOwnProperty('xRange') && (Array.isArray(settings["xRange"]))) {
          console.log("xTicks Not Present Or Array Is Not Correct.Looking For xRange");
          x = (settings["xRange"][1] - settings["xRange"][0]) / x;
          settings["xTicks"] = [];
          x = parseFloat(x.toFixed(1));
          for (var i = settings["xRange"][0]; i < settings["xRange"][1]; i += x) {
  
            settings["xTicks"].push(parseFloat(i.toFixed(1)));
          }
          settings.hasXTicks = true;
        }
        else {
          console.log("xRange Is Not Correct")
          settings.hasXTicks = false;
        }
  
        if ((settings.hasOwnProperty('yTicks')) && (Array.isArray(settings["yTicks"]))) {
          settings.hasYTicks = true;
        }
        else if (settings.hasOwnProperty('yRange') && (Array.isArray(settings["yRange"]))) {
  
          y = (settings["yRange"][1] - settings["yRange"][0]) / y;
          settings["yTicks"] = []
          y = parseFloat(y.toFixed(1));
          for (var i = settings["yRange"][0]; i < settings["yRange"][1]; i += y) {
            settings["yTicks"].push(parseFloat(i.toFixed(1)));
          }
          settings.hasYTicks = true;
        }
        else {
          settings.hasYTicks = false;
        }
      };
  
      var handleAxes = function () {
        if ((settings["orientation"] == "left-bottom") || (settings["orientation"] == "left-top") || (settings["orientation"] == "right-bottom") || (settings["orientation"] == "right-top")) {
          var temp;
          temp = settings["xlabel"]
          settings["xlabel"] = settings["ylabel"]
          settings["ylabel"] = temp;
  
          temp = settings["propMap"]["xAxis"]
          settings["propMap"]["xAxis"] = settings["propMap"]["yAxis"]
          settings["propMap"]["yAxis"] = temp;
  
          if (settings["hasXTicks"] == true&& settings["hasYTicks"]==true) {
            temp = settings["xTicks"]
            settings["xTicks"] = settings["yTicks"]
            settings["yTicks"] = temp;
          }
          
          if (settings["orientation"] == "left-bottom") {
            settings["orientation"] = "bottom-left"
          }
          else if (settings["orientation"] == "left-top") {
            settings["orientation"] = "top-left"
          }
          else if (settings["orientation"] == "right-bottom") {
            settings["orientation"] = "bottom-right"
          }
          else if (settings["orientation"] == "right-top") {
            settings["orientation"] = "top-right"
          }
        }
      };
  
      var checkProperties = function () {
        var dataProp = ['label', 'type', 'color', 'dataSource'];
        var settingProp = ['orientation', 'xlabel', 'ylabel', 'propMap'];
        data.forEach(function (dataObj) {
          dataProp.forEach(function (prop) {
            if (!dataObj.hasOwnProperty(prop)) {
              throw new Error("in options.data" + prop + " is not defined!");
            }
          });
        });
        settingProp.forEach(function (prop) {
          if (!settings.hasOwnProperty(prop)) {
            throw new Error("in options.settings " + prop + " is not defined!");
          }
        });
      };
  
      var checkDataPropValues = function () {
        var validChartTypes = ['Area', 'Line', 'Scatter', 'Bar'];
        data.forEach(function (dataObj) {
          var dataProp = Object.keys(dataObj);
          dataProp.forEach(function (dataKey) {
            switch (dataKey) {
              case 'type':
                if (validChartTypes.indexOf(dataObj[dataKey]) < 0) {
                  throw new Error("Not a valid chart type");
                }
                break;
              case 'color':
                var isOk = /^#[0-9A-F]{6}$/i
                var validColor = isOk.test(dataObj[dataKey]);
                if (!validColor) {
                  throw new Error("Not a valid Hex color code");
                }
                break;
              case 'dataSource':
                var x = settings["propMap"]["xAxis"], y = settings["propMap"]["yAxis"];
                for (var i in dataObj.dataSource) {
                  var objectdata = dataObj.dataSource[i];
                  if ((!objectdata.hasOwnProperty(x))) {
                    throw new Error("property " + x + " missing in data array index " + i);
                  } else if ((!objectdata.hasOwnProperty(y))) {
                    throw new Error("property " + y + " missing in data array index " + i);
                  }
                }
                break;
            }
          });
        });
      };
  
      var checkSettingPropValues = function () {
        var settingKeys = Object.keys(settings);
        var orientationValues = ['bottom-left', 'bottom-right', 'top-left', 'top-right', 'left-bottom', 'right-bottom', 'left-top', 'right-top'];
        settingKeys.forEach(function (settingKey) {
          switch (settingKey) {
            case 'orientation':
              if (orientationValues.indexOf(settings.orientation) < 0) {
                throw new Error('Orientation Input Incorrect!');
              }
              break;
            case 'propMap':
              var PropertyMap = settings["propMap"];
              if ((!PropertyMap.hasOwnProperty('xAxis')) || (!PropertyMap.hasOwnProperty('yAxis'))) {
                throw new Error("Property Map Does Not Exist!");
              }
              break;
            case 'yLog':
              if (!(typeof (settings["yLog"]) == "boolean")) {
                throw new Error("ylog format incorrect!");
              }
              break;
            case 'xTicks':
              if (!(Array.isArray(settings["xTicks"]))) {
                throw new Error("xTicks must be an Array!");
              }
              break;
            case 'yTicks':
              if (!(Array.isArray(settings["yTicks"]))) {
                throw new Error("yTicks must be an Array!");
              }
              break;
            case 'xRange':
              if (!(Array.isArray(options["xRange"]))) {
                throw new Error("xRange must be an Array!");
              }
              break;
            case 'yRange':
              if (!(Array.isArray(options["yRange"]))) {
                throw new Error("yRange must be an Array!");
              }
              break;
          }
        });
      };
  
      var checkPropertyValues = function () {
        checkSettingPropValues();
        checkDataPropValues();
      };
  
  
      var validate = function () {
        checkProperties();
        checkPropertyValues();
        return true;
      };
  
      var extractData = function (data, settings) {
        var parsedData = data.map(function (dataObj) {
          dataObj.data = [];
          for (var i in dataObj.dataSource) {
            if((settings["ylog"]==false) ||(settings["ylog"]==true && dataObj.dataSource[i][settings["propMap"]["yAxis"]]!=0 ))
            dataObj["data"].push([dataObj.dataSource[i][settings["propMap"]["xAxis"]], dataObj.dataSource[i][settings["propMap"]["yAxis"]]])
          }
          return dataObj;
        });
        return parsedData;
      };
  
      var extractColorPallette = function (data) {
        var colorPallete = [];
        for (var i in data) {
          colorPallete.push(data[i].color);
        }
        return colorPallete;
      };
  
      function start() {
        d3.select($parent).append('svg');
        var margin = { top: 30, right: 10, bottom: 50, left: 60 },
          chart = draw()
            .xAxis.label(settings["xlabel"])
            .width(width(margin))
            .height(height(margin))
            .yAxis.label(settings["ylabel"]);
        var svg = d3.select($parent).select(' svg')
          .datum(data)
        svg.transition().duration(500)
          .attr('width', width(margin))
          .attr('height', height(margin))
          .call(chart);
        chart.dispatch.on('showTooltip', function (e) {
          console.log(e);
          var offset = $($parent).offset(), // { left: 0, top: 0 }
            left = e.pos[0] + offset.left,
            top = e.pos[1] + offset.top,
            formatter = d3.format(".04f");
          var content = e.series["tooltiptemplate"] || settings["tooltiptemplate"];
          var regex = /({{.*?}})/g
          var datavalues = content.match(regex)
          var filteredvalues = datavalues.map(function (d) {
            return d.slice(2, -2);
          })
          var replacement = [];
          for (var i = 0; i < filteredvalues.length; i++) {
            replacement.push(e["series"]["dataSource"][e.pointIndex][filteredvalues[i]]);
          }
          for (var i = 0; i < replacement.length; i++) {
            content = content.replace(datavalues[i], replacement[i]);
          }
          content+="<circle cx=\""+e.pos[0]+"\" cy=\""+e.pos[1]+"\" r='2.5' style='stroke-opacity: 1;fill-opacity: 0.5;fill: rgb(31, 119, 180);stroke: rgb(31, 119, 180);'></circle>";
          nvtooltip.show([left, top], content);
        });
        chart.dispatch.on('hideTooltip', function (e) {
          nvtooltip.cleanup();
        });
  
        var nvtooltip = window.nvtooltip = {};
        nvtooltip.show = function (pos, content, gravity, dist) {
          var container = $('<div class="nvtooltip">');
          gravity = gravity || 's';
          dist = dist || 20;
          container
            .html(content)
            .css({ left: -1000, top: -1000, opacity: 0 })
            .appendTo('body');
          var height = container.height() + parseInt(container.css('padding-top')) + parseInt(container.css('padding-bottom')),
            width = container.width() + parseInt(container.css('padding-left')) + parseInt(container.css('padding-right')),
            windowWidth = d3.select($parent).style("width"),
            windowHeight = d3.select($parent).style("height"),
            scrollTop = $('body').scrollTop(),  //TODO: also adjust horizontal scroll
            left, top;
          //TODO: implement other gravities
          switch (gravity) {
            case 'e':
            case 'w':
            case 'n':
              left = pos[0] - (width / 2);
              top = pos[1] + dist;
              if (left < 0) left = 5;
              if (left + width > windowWidth) left = windowWidth - width - 5;
              if (scrollTop + windowHeight < top + height) top = pos[1] - height - dist;
              break;
            case 's':
              left = pos[0] - (width / 2);
              top = pos[1] - height - dist;
              if (left < 0) left = 5;
              if (left + width > windowWidth) left = windowWidth - width - 5;
              if (scrollTop > top) top = pos[1] + dist;
              break;
          }
          container
            .css({
              left: left,
              top: top,
              opacity: 1
            });
        };
        nvtooltip.cleanup = function () {
          var tooltips = $('.nvtooltip');
          // remove right away, but delay the show with css
          tooltips.css({
            'transition-delay': '0 !important',
            '-moz-transition-delay': '0 !important',
            '-webkit-transition-delay': '0 !important'
          });
          tooltips.css('opacity', 0);
          setTimeout(function () {
            tooltips.remove()
          }, 500000);
        };
      }
  
      var init = function () {
        data = options.data;
        settings = options.settings;
        if (validate()) {
          handleTicks();
          handleAxes();
          data = extractData(data, settings);
          var colorPallette = extractColorPallette(data);
          settings = $.extend({
            // These are the defaults.
            tooltiptemplate: '<p>' +
            '<span class="value">[{{' + settings["propMap"]["xAxis"] + '}}, {{' + settings["propMap"]["yAxis"] + '}}]</span>' +
            '</p>',
            color: colorPallette,
            ylog: false,
            xlabel: "X-Axis",
            ylabel: "Y-Axis",
            orientation: "bottom-left"
          }, options.settings);
          start();//TODO implement start
        } else {
          console.log('Error initialising Chart Library');
        }
      };
  
      init();
  
    };
  
  })(jQuery);
  