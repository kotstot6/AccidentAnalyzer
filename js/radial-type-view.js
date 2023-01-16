
class RadialTypeView
{
  constructor(weather, index)
  {
    this.weathers = ['Cloudy', 'Rain', 'Snow', 'Thunder', 'Visibility'];

    this.views = {};

    this.weathers.forEach((w, i) => {
      this.views[w] = new RadialComponent(w,i);
    });
  }

  init_graph(data)
  {
    var sums = {};

    for (let k in this.views)
    {
      sums[k] = this.views[k].init_graph(data);
    }

    this.add_percents(sums);
  }

  add_data(data)
  {
    var sums = {};

    for (let k in this.views)
    {
      sums[k] = this.views[k].add_data(data);
    }

    this.add_percents(sums);
  }

  add_percents(sums)
  {
    var total_sum = d3.sum(Object.keys(sums).map(k => sums[k]));

    for (let k in this.views)
    {
      this.views[k].add_percent(sums[k] / total_sum);
    }
  }

  add_regions(data)
  {
    var get_key = d => ((map_view.state_view) ? region_dict['states'][parseInt(d.State)]
                                  : region_dict['counties'][parseInt(d.County)]);

    var geojson = [];
    map_view.current_regions.eachLayer(layer => geojson.push(layer.feature));
    var bounds = map_view.current_regions.getBounds();
    var c_x = (bounds._northEast.lng + bounds._southWest.lng) / 2
    var c_y = (bounds._northEast.lat + bounds._southWest.lat) / 2

    var projection = d3.geoMercator()
                       .fitSize([60,60], {type: 'FeatureCollection', features: geojson})
                       .center([c_x, c_y])
                       .translate([0,0]);

    var path = d3.geoPath(projection);

    for (let weather in this.views)
    {

      var data_w = {}
      data.forEach(d => {
        data_w[get_key(d)] = parseInt(d['SUM(' + weather + ')']);
      });

      this.views[weather].add_regions(geojson, data_w, path);
    }

  }

  query_data(condition, init, key)
  {
    var sql_command = 'SELECT Year, Month, SUM(Cloudy), SUM(Rain), SUM(Snow), SUM(Thunder), SUM(Visibility) FROM us_accidents WHERE ' + condition + ' GROUP BY Year, Month ORDER BY Year, Month';

    if (show_sql) console.log(sql_command);

    d3.json('php/query.php?SQL=' + sql_command).then(data => {
      (init) ? this.init_graph(data) : this.add_data(data);
    });

    if (key === 'map-view') this.add_regions(condition);
  }

  get_query(condition)
  {
    var sql1 = 'SELECT Year, Month, SUM(Cloudy), SUM(Rain), SUM(Snow), SUM(Thunder), SUM(Visibility) FROM us_accidents WHERE ' + condition + ' GROUP BY Year, Month ORDER BY Year, Month;';

    var attribute = (map_view.state_view) ? 'State' : 'County';
    var sums = 'SUM(Cloudy), SUM(Rain), SUM(Snow), SUM(Thunder), SUM(Visibility)';
    var sql2 = ('SELECT ' + attribute + ', ' + sums + ' FROM us_accidents WHERE '
                        + condition + ' GROUP BY ' + attribute + ' ORDER BY ' + attribute + ';');

    return {query: sql1 + sql2, n_queries: 2};
  }

  receive_query_results(data, init, key)
  {
    (init) ? this.init_graph(data[0]) : this.add_data(data[0]);
    this.add_regions(data[1]);
  }

  annotate()
  {
    if (annotation_checked)
    {
      d3.select('#tooltip').select('h4').html('Radial Type View');
      d3.select('#tooltip').select('p').html('<b>Outside:</b> A radial bar chart of each weather condition\'s accident counts over time <br> <b>Inside:</b> Spatial distribution of each weather condition (darker = more activity)');
    }
  }



}

class RadialComponent
{

  constructor(weather, index)
  {

    this.weather = weather;
    this.id = 'radial-' + weather + '-view'
    this.index = index;

    this.margin = {top: 0, right: 0, bottom: 0, left: 0};
    this.width = 190 - this.margin.left - this.margin.right;
    this.height = 250 - this.margin.top - this.margin.bottom;
    this.inner_radius = 40;
    this.outer_radius = 80;

    this.x_year = d3.scaleBand().range([0, 2 * Math.PI]);
    this.y = d3.scaleRadial().range([this.inner_radius, this.outer_radius]);

    this.color = d3.scaleOrdinal([0,1,2,3,4], d3.schemeSet2)(4 - this.index);
    this.rgb = this.hex_to_rgb(this.color);

    var years = ['2017', '2018', '2019', '2020', '2021', '2016'];
    this.x_year.domain(years);
    this.y.domain([0,1]);

    var data = years.map(y => {return {'Year' : y, 'Count' : 1}});

    this.svg = d3.select('#' + this.id)
              .append('g')
              .attr('transform', 'translate(' + (this.width/2 + this.margin.left) + ',' + (this.height/2 + this.margin.top) + ')');

    this.svg.append('g')
            .selectAll('path')
            .data(data)
            .enter()
            .append('path')
            .attr('fill', 'transparent')
            .attr('stroke', this.color)
            .attr('stroke-width', '0.5')
            .attr('d', d3.arc()
                        .innerRadius(this.inner_radius)
                        .outerRadius(d => this.y(d.Count))
                        .startAngle(d => this.x_year(d.Year))
                        .endAngle(d => this.x_year(d.Year) + this.x_year.bandwidth())
                        .padAngle(0)
                        .padRadius(this.inner_radius)
                  );

    this.svg.append('g')
            .selectAll('g')
            .data(data)
            .enter()
            .append('g')
              .attr('text-anchor', 'middle')
              .attr('transform', d => 'rotate(' + (180 / Math.PI) * (this.x_year(d.Year)) +') translate(' + (this.y(d.Count) + 5) + ', 0)')
            .append('text')
            .text(d => d.Year)
            .attr('transform', 'rotate(90)')
            .style('font-size', '11px')
            .style('font-family', 'arial')
            .style('fill', this.color)
            .attr('alignment-baseline', 'middle');

    this.svg.append('text')
            .text(this.weather.toUpperCase())
            .attr('text-anchor', 'middle')
            .attr('x', 0)
            .attr('y', 110)
            .attr('font-family', 'arial')
            .attr('font-size', 12)
            .attr('fill', this.color);

  }

  hex_to_rgb(hex)
  {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
  }

  init_graph(orig_data)
  {
    var data = orig_data.map(d => {return {'Month' : d.Month, 'Year' : d.Year, 'Count' : d['SUM(' + this.weather + ')']}});

    this.x_domain = data.map(d => d.Month + '/' + d.Year);
    this.x = d3.scaleBand().range([0, 2 * Math.PI]).domain(this.x_domain);

    var init_arc = d3.arc()
                  .innerRadius(this.inner_radius)
                  .outerRadius(this.inner_radius)
                  .startAngle(d => this.x(d.Month + '/' + d.Year))
                  .endAngle(d => this.x(d.Month + '/' + d.Year) + this.x.bandwidth())
                  .padAngle(0)
                  .padRadius(this.inner_radius);

    this.svg.append('g')
            .selectAll('path')
            .data(data)
            .enter()
            .append('path')
            .attr('class', 'ratv-path-' + this.weather)
            .attr('fill', this.color)
            .attr('stroke', 'black')
            .attr('stroke-width', '0.5')
            .attr('prev_count', 0)
            .attr('d', init_arc);

    return this.add_data(orig_data);
  }

  add_data(data)
  {
    var data_map = {}
    this.x_domain.forEach(t => data_map[t] = 0);
    data = data.map(d => {return {'Time' : d.Month + '/' + d.Year, 'Count' : parseInt(d['SUM(' + this.weather + ')'])}});
    data.forEach(d => data_map[d.Time] = d.Count);

    data = Object.keys(data_map).map(t => {
      var time = t.split('/');
      return {'Month' : time[0], 'Year' : time[1], 'Count' : data_map[t]};
    });

    var max_y = Math.max(1, d3.max(data.map(d => d.Count)));

    this.y.domain([0, max_y]);

    var arc = d3.arc()
                .innerRadius(this.inner_radius)
                .outerRadius(d => this.y(d.Count))
                .startAngle(d => this.x(d.Month + '/' + d.Year))
                .endAngle(d => this.x(d.Month + '/' + d.Year) + this.x.bandwidth())
                .padAngle(0)
                .padRadius(this.inner_radius);

    function arc_tween(transition)
    {
      transition.attrTween('d', function (d) {
          var interpolate = d3.interpolate(max_y * d3.select(this).attr('prev_count'), d.Count);
          return t => {d.Count = interpolate(t); return arc(d);};
        });
    }

    d3.selectAll('.ratv-path-' + this.weather)
      .data(data)
      .transition()
      .duration(1000)
      .call(arc_tween)
      .attr('prev_count', d => (max_y == 0) ? 0.5 : d.Count / max_y);

    return d3.sum(data.map(d => d.Count));
  }

  add_percent(percent)
  {
    percent = Number(percent).toLocaleString(undefined, {style: 'percent', minimumFractionDigits:2});

    d3.select('#ratv-percent-' + this.weather).remove();


    this.svg.append('text')
            .attr('id', 'ratv-percent-' + this.weather)
            .text(percent)
            .attr('text-anchor', 'middle')
            .attr('x', 0)
            .attr('y', -100)
            .attr('font-family', 'arial')
            .attr('font-size', 16)
            .attr('fill', this.color)
            .attr('font-weight', 'bold')
            .attr('font-style', 'italic');
  }

  add_regions(geojson, data, path)
  {

    var max_count = Math.max(1,d3.max(Object.keys(data).map(k => data[k])));
    var scale = d3.scaleSequentialSqrt().range([0,1]).domain([0,max_count]);
    var rgb = a => 'rgba(' + this.rgb.r + ',' + this.rgb.g + ',' + this.rgb.b + ',' + a + ')';

    d3.select('#ratv-regions-' + this.weather).remove();

    this.svg.append('g')
        .attr('id', 'ratv-regions-' + this.weather)
        .selectAll('path')
        .data(geojson)
        .enter()
        .append('path')
        .attr('fill', d => rgb(scale((d.properties.NAME in data) ? data[d.properties.NAME] : 0)))
        .attr('stroke', 'black')
        .attr('stroke-width', 0.1)
        .attr('d', path);
  }

}
