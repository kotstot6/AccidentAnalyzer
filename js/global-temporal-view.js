
class GlobalTemporalView
{
  constructor()
  {

    this.margin = {top: 10, right: 15, bottom: 25, left: 30},
    this.width = 700 - this.margin.left - this.margin.right,
    this.height = 200 - this.margin.top - this.margin.bottom;

    this.parseDate = d3.timeParse('%m/%Y');

    this.x = d3.scaleTime().range([0, this.width]);
    this.y = d3.scaleLinear().range([this.height, 0]);

    this.svg = d3.select('#global-temporal-view')
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    this.x.domain([this.parseDate('01/2016'), this.parseDate('12/2021')]);
    this.y.domain([0, 1]);

    this.svg.append('g')
        .attr('class', 'axis')
        .attr('id', 'gtv-x-axis')
        .attr('transform', 'translate(0,' + this.height + ')')
        .call(d3.axisBottom(this.x));

    this.svg.append('g')
        .attr('class', 'axis')
        .attr('id', 'gtv-y-axis')
        .call(d3.axisLeft(this.y));

    this.scale = 0.001;

    this.clip = this.svg.append('defs')
                        .append('svg:clipPath')
                        .attr('id', 'gtv-clip')
                        .append('svg:rect')
                        .attr('width', this.width)
                        .attr('height', this.height)
                        .attr('x', 0)
                        .attr('y', 0);

    this.brush = d3.brushX()
                  .extent([[0,0],[this.width,this.height]])
                  .on('end', e => this.update_domain(e));

    this.area = this.svg.append('g')
                        .attr('clip-path', 'url(#gtv-clip)');

    this.area_generator = d3.area()
                            .curve(d3.curveCatmullRom)
                            .x(d => this.x(this.parseDate(d.Month + '/' + d.Year)))
                            .y0(this.y(0))
                            .y1(d => this.y(this.scale * parseInt(d['COUNT(*)'])));

    this.cropped = false;

  }

  update_domain(e)
  {
    if (!e.selection)
    {
      return;
    }

    var start_time = this.x.invert(e.selection[0]);
    var end_time = this.x.invert(e.selection[1]);

    this.x.domain([start_time, end_time]);

    var filter_data = this.data.filter(d => {
      var time = this.parseDate(d.Month + '/' + d.Year);
      return time >= start_time && time <= end_time;
    });

    this.y.domain([0, 1.1 * this.scale * d3.max(filter_data.map(d => parseInt(d['COUNT(*)'])))]);

    d3.select('#gtv-brush').call(this.brush.move, null);

    d3.select('#gtv-x-axis').transition().duration(1000).call(d3.axisBottom(this.x));
    d3.select('#gtv-y-axis').transition().duration(1000).call(d3.axisLeft(this.y));

    d3.select('#gtv-line')
      .transition()
      .duration(1000)
      .attr('d', this.area_generator);

    d3.select('#gtv-reset').style('display', 'initial');

    this.send_filter([start_time, end_time]);
  }

  reset_domain()
  {
    this.x.domain([d3.min(this.dates), d3.max(this.dates)]);
    d3.select('#gtv-x-axis').transition().duration(1000).call(d3.axisBottom(this.x));
    d3.select('#gtv-reset').style('display', 'none');
    this.add_data(this.data);
    this.send_filter([]);
  }

  time_format(time)
  {
    var time_str = '';
    time_str += time.getFullYear() + '-' + (time.getMonth() + 1) + '-' + time.getDate() + ' ';
    time_str += time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
    time_str += '.' + time.getMilliseconds();

    return time_str;
  }

  send_filter(interval)
  {
    var condition = '';

    if (interval.length == 0)
    {
      condition += '1';
    }
    else
    {
      var start_time = this.time_format(interval[0]);
      var end_time = this.time_format(interval[1]);
      condition += 'Timestamp >= \'' + start_time + '\' AND Timestamp <= \'' + end_time + '\'';
    }

    console.log(condition);

    database.receive_filter('global-temporal-view', condition);
  }

  make_gridlines(num_lines)
  {
    for (var i = 1; i <= num_lines; i++)
    {
      var y = (this.height / (num_lines + 1)) * i;
      var data = [{x : 0, y : y}, {x : this.width, y : y}];

      var gridline = d3.line().x(d => d.x).y(d => d.y);

      this.area.append('path')
              .data([data])
              .attr('stroke', 'rgb(200,200,200)')
              .attr('stroke-dasharray', '5,5')
              .attr('d', gridline);
    }
  }

  init_graph(data)
  {
    this.dates = data.map(d => this.parseDate(d.Month + '/' + d.Year))
    this.x.domain([d3.min(this.dates), d3.max(this.dates)]);

    d3.select('#gtv-x-axis').call(d3.axisBottom(this.x));

    var init_area = d3.area().curve(d3.curveCatmullRom)
                            .x(d => this.x(this.parseDate(d.Month + '/' + d.Year)))
                            .y0(this.y(0))
                            .y1(this.y(0));

    this.data = data;

    this.make_gridlines(10);

    this.area.append('path')
            .data([data])
            .attr('id', 'gtv-line')
            .attr('fill', 'rgb(215,230,226)')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('d', init_area);


    this.area.append('g')
              .attr('id', 'gtv-brush')
              .call(this.brush);

    this.base_data = {}
    data.forEach(d => {
      this.base_data[d.Month + ',' + d.Year] = 0;
    })

    this.add_data(data);

  }

  add_data(new_data)
  {

    var data_dict = {...this.base_data}

    new_data.forEach(d => {data_dict[d.Month + ',' + d.Year] = d['COUNT(*)'];});

    var data = []
    for (let key in data_dict) {
      var nums = key.split(',');
      data.push({'Month' : nums[0], 'Year' : nums[1], 'COUNT(*)' : data_dict[key]});
    }


    this.y.domain([0, d3.max(data.map(d => this.scale * parseInt(d['COUNT(*)'])))]);
    d3.select('#gtv-y-axis').transition().duration(1000).call(d3.axisLeft(this.y));

    this.data = data;

    d3.select('#gtv-line')
      .data([data])
      .transition()
      .duration(1000)
      .attr('d', this.area_generator);
  }

  get_query(condition)
  {
    var sql = 'SELECT Year, Month, COUNT(*) FROM us_accidents WHERE ' + condition + ' GROUP BY Year, Month ORDER BY Year, Month;';
    return {query: sql, n_queries: 1};
  }

  receive_query_results(data, init)
  {
    (init) ? this.init_graph(data[0]) : this.add_data(data[0]);
  }

  annotate()
  {
    if (annotation_checked)
    {
      d3.select('#tooltip').select('h4').html('Global Temporal View');
      d3.select('#tooltip').select('p').html('An area chart of accident counts <b>(in thousands)</b> over time, discretized by month.');
    }
  }

}
