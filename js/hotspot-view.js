

class HotspotView
{

  constructor()
  {

    this.hotspots = []
    for (var i = 0; i < 3; i++) this.hotspots.push(new HotspotComponent(i+1));

    this.times = []
    for (var year = 2016; year <= 2021; year++)
    {
      for (var month = 1; month <= 12; month++)
      {
        this.times.push(month + '/' + year);
      }
    }

    this.hotspot_graph = new HotspotGraph(this.times);
  }

  add_regions(data, init)
  {
    var get_region_key = d => ((map_view.state_view) ? region_dict['states'][parseInt(d.State)]
                                  : region_dict['counties'][parseInt(d.County)]);

    var geojson = [];
    map_view.current_regions.eachLayer(layer => geojson.push(layer.feature));
    var bounds = map_view.current_regions.getBounds();
    var c_x = (bounds._northEast.lng + bounds._southWest.lng) / 2
    var c_y = (bounds._northEast.lat + bounds._southWest.lat) / 2

    var projection = d3.geoMercator()
                       .fitSize([195,195], {type:"FeatureCollection", features: geojson})
                       .center([c_x, c_y])
                       .translate([0,0]);

    var path = d3.geoPath(projection);

    this.nmf(geojson, data, get_region_key).then(results => {
      for (var j = 0; j < 3; j++)
      {
        var w_data = {}
        this.region_names.forEach((region,i) => {
          w_data[region] = results.W[i][j];
        });

        this.hotspots[j].add_regions(geojson, path, w_data);
      }

      if (init)
      {
        this.hotspot_graph.init_graph(results.H);
      }
      else
      {
        this.hotspot_graph.add_data(results.H);
      }

    });

  }

  nmf(geojson, data, get_region_key)
  {
    var get_time_key = d => d.Month + '/' + d.Year;

    this.region_names = geojson.map(d => d.properties.NAME).sort()

    var matrix = this.region_names.map(r => this.times.map(t => 0));

    data.forEach( d => {
      var i = this.region_names.indexOf(get_region_key(d));
      var j = this.times.indexOf(get_time_key(d));
      matrix[i][j] = parseInt(d['COUNT(*)']);
    });

    return python_nmf(matrix);
  }

  get_query(condition)
  {
    var attribute = (map_view.state_view) ? 'State' : 'County';
    var sql = ('SELECT ' + attribute + ', Year, Month, COUNT(*) FROM us_accidents WHERE ' + condition
              + ' GROUP BY ' + attribute + ', Year, Month ORDER BY ' + attribute + ', Year, Month;');
    return {query: sql, n_queries: 1};
  }

  receive_query_results(data, init, key)
  {
    this.add_regions(data[0], init);
  }

  annotate()
  {
    if (annotation_checked)
    {
      d3.select('#tooltip').select('h4').html('Hotspot View');
      d3.select('#tooltip').select('p').html('Three hotspots identified by non-negative matrix factorization. \
      <br><b>Upper:</b> Temporal graph (activity over time)<br><b>Middle:</b> Spatial distributions (darker = more activity)<br> \
      <b>Lower:</b> Hotspot gauges (needle = importance metric, percentage = activity rate)');
    }
  }

}

class HotspotComponent
{

  constructor(index)
  {
    this.width = 200;
    this.height = 200;
    this.index = index;

    var colors = [
      {r : 122, g : 23, b: 13},
      {r : 210, g : 84, b: 36},
      {r : 241, g : 161, b: 37}
    ];
    this.rgb = colors[index-1];

    this.svg = d3.select('#hotspot-map-' + this.index)
                      .append('g')
                      .attr('transform', 'translate(' + (this.width/2) + ',' + (this.height/2) + ')')
                      .on('mouseover', e => this.highlight_line())
                      .on('mouseout', e => this.reset_highlight());
  }

  add_regions(geojson, path, data)
  {
    var max_val = d3.max(Object.keys(data).map(k => data[k]));
    var scale = d3.scaleSequentialSqrt().range([0.1,1]).domain([0,max_val]);
    var rgba = a => 'rgba(' + this.rgb.r + ',' + this.rgb.g + ',' + this.rgb.b + ',' + a + ')';

    d3.select('#hv-regions-' + this.index).remove();

    this.svg.append('g')
        .attr('id', 'hv-regions-' + this.index)
        .selectAll('path')
        .data(geojson)
        .enter()
        .append('path')
        .attr('fill', d => rgba(scale(data[d.properties.NAME])))
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .attr('d', path);
  }

  highlight_line()
  {
    d3.selectAll('.hv-line').attr('opacity', 0.2);
    d3.select('#hv-line-' + (this.index - 1)).attr('opacity', 1);
  }

  reset_highlight()
  {
    d3.selectAll('.hv-line').attr('opacity', 1);
  }

}

class HotspotGauge
{
  constructor(index)
  {
    this.index = index;
    this.height = 100;
    this.width = 200;

    this.svg = d3.select('#hotspot-gauge-' + this.index)
                  .append('g')
                  .attr('transform', 'translate(' + (this.width/2) + ',' + (this.height/2 - 1) + ')');

    this.svg.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 48)
            .attr('stroke', 'black')
            .attr('fill', 'rgb(203,203,203)');
    this.svg.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 42)
            .attr('stroke', 'transparent')
            .attr('fill', 'white');

    this.svg.append('text')
            .attr('id', 'hv-gauge-text-' + this.index)
            .text('')
            .attr('text-anchor', 'middle')
            .attr('font-family', 'arial')
            .attr('font-size', 14)
            .attr('x', 0)
            .attr('y', 30);

    this.inner_radius = 30;
    this.outer_radius = 40;
    this.x_color = d3.scaleBand().range([-3*Math.PI / 4, -3*Math.PI / 4 + (6*Math.PI / 4)]).domain([1,2,3]);
    this.x_tick = d3.scaleBand().range([-3*Math.PI / 4, -3*Math.PI / 4 + (6*Math.PI / 4)]).domain([...Array(15).keys()]);
    this.y = d3.scaleRadial().range([this.inner_radius, this.outer_radius]).domain([0,1]);

    var color_data = [{x: 1, c: 'rgb(254,253,237)'}, {x: 2, c: 'rgb(231,161,86)'}, {x: 3, c: 'rgb(86,43,22)'}];

    this.svg.append('g')
            .selectAll('path')
            .data(color_data)
            .enter()
            .append('path')
            .attr('fill', d => d.c)
            .attr('stroke', 'transparent')
            .attr('d', d3.arc()
                        .innerRadius(this.inner_radius)
                        .outerRadius(this.outer_radius)
                        .startAngle(d => this.x_color(d.x))
                        .endAngle(d => this.x_color(d.x) + this.x_color.bandwidth())
                        .padAngle(0)
                        .padRadius(this.inner_radius)
                  );

    this.svg.append('g')
            .selectAll('path')
            .data([...Array(15).keys()])
            .enter()
            .append('path')
            .attr('fill', 'black')
            .attr('stroke', 'transparent')
            .attr('d', d3.arc()
                        .innerRadius((this.inner_radius + this.outer_radius) / 2)
                        .outerRadius(this.outer_radius)
                        .startAngle(d => this.x_tick(d))
                        .endAngle(d => this.x_tick(d) + 0.04)
                        .padAngle(0)
                        .padRadius(this.inner_radius)
                  );

    this.svg.append('polygon')
            .attr('id', 'hv-needle-' + this.index)
            .attr('fill', 'rgba(174,77,49,0.7)')
            .attr('stroke', 'rgb(174,77,49)')
            .attr('stroke-width', 1)
            .attr('points', '-4,0 0,-40 4,0 0,15')
            .attr('transform', 'rotate(-135)');

    this.svg.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 7)
            .attr('stroke', 'rgb(100,100,100)')
            .attr('fill', 'rgb(99,127,188)');


    this.scale_needle = d3.scaleLinear().range([-135, 135]).domain([0,1]);

  }

  add_data(count_freq, temp_freq)
  {

    d3.select('#hv-gauge-text-' + this.index).text(parseInt(100 * count_freq) + '%');

    var needle_val = (0.7 * count_freq * (1 - temp_freq)
                        + 0.5 * (1 - count_freq) * temp_freq + count_freq * temp_freq);

    d3.select('#hv-needle-' + this.index)
      .transition().duration(1000)
      .attr('transform', 'rotate(' + this.scale_needle(needle_val) + ')');
  }
}

async function python_nmf(matrix)
{
  var pyodide = await pyodide_promise;

  pyodide.globals.set('V', JSON.stringify(matrix));
  pyodide.runPython(
    `
    import numpy as np
    from sklearn.decomposition import NMF

    V = np.array(eval(V))

    model = NMF(n_components=3, random_state=1)#, init='nndsvd')
    W = model.fit_transform(V).tolist()
    H = model.components_.tolist()
    `
  );

  var w = pyodide.globals.get('W').toJs();
  var h = pyodide.globals.get('H').toJs();

  return {W : w, H : h};
}

class HotspotGraph
{

  constructor(times)
  {
    this.times = times;

    this.margin = {top: 10, right: 10, bottom: 25, left: 20},
    this.width = 612 - this.margin.left - this.margin.right,
    this.height = 80 - this.margin.top - this.margin.bottom;

    this.parseDate = d3.timeParse('%m/%Y');

    this.x = d3.scaleTime().range([0, this.width]);
    this.y = d3.scaleLinear().range([this.height, 0]);

    this.colors = ['rgb(122,23,13)', 'rgb(210,84,36)', 'rgb(241,161,37)'];

    this.svg = d3.select('#hotspot-graph')
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    this.x.domain([this.parseDate('01/2016'), this.parseDate('12/2021')]);
    this.y.domain([0, 1]);

    this.svg.append('g')
        .attr('class', 'axis')
        .attr('id', 'hv-x-axis')
        .attr('transform', 'translate(0,' + this.height + ')')
        .call(d3.axisBottom(this.x));

    this.gauges = [];
    for (var i = 1; i <= 3; i++)
    {
      this.gauges.push(new HotspotGauge(i));
    }

  }

  init_graph(data)
  {
    var init_line = d3.line()
                      .x(d => this.x(this.parseDate(d.Time)))
                      .y(d => this.y(0));

    var data_map = i => this.times.map((t,j) => {return {'Time' : t, 'Value' : data[i][j]}});

    for (var i = 0; i < 3; i++)
    {
      this.svg.append('path')
        .data([data_map(i)])
        .attr('class', 'hv-line')
        .attr('id', 'hv-line-' + i)
        .attr('stroke', this.colors[i])
        .attr('stroke-width', '2')
        .attr('fill', 'transparent')
        .attr('d', init_line);
    }

    this.add_data(data);
  }

  add_data(data)
  {

    var count_freqs = [0, 0, 0];
    var temp_freqs = [0, 0, 0];

    for (var j = 0; j < data[0].length; j++)
    {
      var max_j = Math.max(data[0][j], data[1][j], data[2][j]);

      for (var i = 0; i < 3; i++)
      {
        count_freqs[i] += data[i][j];
        data[i][j] = (max_j == 0) ? 0.5 : data[i][j] / max_j;
        temp_freqs[i] += data[i][j];
      }
    }

    var line = d3.line()
                  .x(d => this.x(this.parseDate(d.Time)))
                  .y(d => this.y(d.Value));

    var data_map = i => this.times.map((t,j) => {return {'Time' : t, 'Value' : data[i][j]}});

    for (var i = 0; i < 3; i++)
    {
      d3.select('#hv-line-' + i)
        .data([data_map(i)])
        .transition()
        .duration(1000)
        .attr('d', line);
    }

    var total_count = d3.sum(count_freqs);

    for (var i = 0; i < 3; i++)
    {
      this.gauges[i].add_data(count_freqs[i] / total_count, temp_freqs[i] / data[0].length);
    }

  }

}
