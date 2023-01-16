
class FilterWidgetView
{
  constructor(id, attributes, get_attribute)
  {

    this.id = id;
    this.get_attribute = get_attribute;

    this.margin = {top: 10, right: 10, bottom: 27, left: 10};
    this.width = 250 - this.margin.left - this.margin.right;
    this.height = 200 - this.margin.top - this.margin.bottom;

    this.x = d3.scaleLinear().range([0, this.width]);
    this.y = d3.scaleBand().range([this.height, 0]);

    this.svg = d3.select('#' + this.id)
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    this.attributes = attributes;
    this.actives = this.attributes.map(t => false);

    this.x.domain([0,1]);
    this.y.domain(this.attributes);

    this.svg.append('g')
        .attr('class', 'axis')
        .attr('id', this.id + '-x-axis')
        .attr('transform', 'translate(0,' + this.height + ')')
        .call(d3.axisBottom(this.x))
        .selectAll('text')
        .attr('transform', 'rotate(-40) translate(-10,-2)');

    this.svg.append('g')
        .attr('class', 'axis')
        .attr('id', this.id + '-y-axis')
        .call(d3.axisRight(this.y));

    this.scale = 0.001;
  }

  make_gridlines(num_lines)
  {
    for (var i = 1; i <= num_lines; i++)
    {
      var x = (this.width / (num_lines + 1)) * i;
      var data = [{x : x, y : 0}, {x : x, y : this.height}];

      var gridline = d3.line().x(d => d.x).y(d => d.y);

      this.svg.append('path')
              .data([data])
              .attr('stroke', 'rgb(200,200,200)')
              .attr('stroke-dasharray', '5,5')
              .attr('d', gridline);
    }
  }

  init_graph(orig_data)
  {

    var data = this.process_data(orig_data)

    this.make_gridlines(10);

    this.svg.selectAll(this.id + '-rects')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', this.id + '-rect')
            .attr('id', d => this.id + '-rect-' + this.get_attribute(d))
            .attr('x', d => this.x(0))
            .attr('y', d => this.y(this.attributes[this.get_attribute(d)]) + this.y_shift)
            .attr('width', 0)
            .attr('height', this.bar_height)
            .attr('fill', 'rgb(229,235,244)')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('opacity', 1)
            .on('mouseover', (e,d) => this.highlight_rect(d.Attribute))
            .on('mouseout', (e,d) => this.reset_highlight_rect())
            .on('click', (e,d) => this.activate_filter(d.Attribute));

    d3.select('#' + this.id + '-y-axis').raise();

    this.add_data(orig_data);
  }

  highlight_rect(attr)
  {
    d3.selectAll('.' + this.id + '-rect').attr('fill', 'rgb(229,235,244)');
    d3.select('#' + this.id + '-rect-' + attr).attr('fill', 'rgb(219,225,234)').attr('cursor', 'pointer');
  }

  reset_highlight_rect()
  {
    d3.selectAll('.' + this.id + '-rect').attr('fill', 'rgb(229,235,244)');
  }

  activate_filter(time)
  {

    this.actives[time] = (this.actives[time]) ? false : true;

    if (this.actives.every(x => !x))
    {
      d3.selectAll('.' + this.id + '-rect')
        .transition()
        .duration(500)
        .attr('opacity', 1);
    }
    else
    {
      this.actives.forEach( (a, i) => {
        d3.select('#' + this.id + '-rect-' + i)
          .transition()
          .duration(500)
          .attr('opacity', (a) ? 1 : 0.2);
      });
    }

    if (this.actives.every(x => x)) this.actives = this.actives.map(a => false);

    this.send_filter()
  }

  send_filter()
  {
    var condition = '0';

    if (this.actives.every(x => !x))
    {
      condition += ' OR 1';
    }
    else
    {
      this.actives.forEach((a,i) => {
        if (a) condition += ' OR ' + this.condition_fn(i);
      });
    }

    database.receive_filter(this.id, condition);
  }

  add_data(data)
  {

    data = this.process_data(data)

    var all_data = this.attributes.map(a => 0)

    data.forEach(d => {
      all_data[this.get_attribute(d)] = parseInt(d['COUNT(*)']);
    });

    all_data = all_data.map((d,i) => {return {'Attribute' : i, 'Count' : d};})

    this.x.domain([0, Math.max(this.scale, d3.max(all_data.map(d => this.scale * d.Count)))]);
    d3.select('#' + this.id + '-x-axis')
      .transition()
      .duration(1000)
      .call(d3.axisBottom(this.x))
      .selectAll('text')
      .attr('transform', 'rotate(-40) translate(-10,-2)');

    d3.selectAll('.' + this.id + '-rect')
      .data(all_data)
      .transition()
      .duration(1000)
      .attr('x', 0)
      .attr('width', d => this.x(this.scale * d.Count));
  }

  process_data(data)
  {
    return data;
  }

  receive_query_results(data, init)
  {
    (init) ? this.init_graph(data[0]) : this.add_data(data[0]);
  }

}

class FilterYearView extends FilterWidgetView
{
  constructor()
  {
    var years = ['2016', '2017', '2018', '2019', '2020', '2021'];
    var get_attribute = d => parseInt(d.Year) - 2016;

    super('filter-year-view', years, get_attribute);

    this.y_shift = 4;
    this.bar_height = 19;

  }

  condition_fn(i)
  {
    return 'Year = ' + this.attributes[i];
  }

  query_data(condition, init)
  {
    var sql_command = 'SELECT Year, COUNT(*) FROM us_accidents WHERE ' + condition + ' GROUP BY Year ORDER BY Year';

    if (show_sql) console.log(sql_command);

    d3.json('php/query.php?SQL=' + sql_command).then(data => (init) ? this.init_graph(data) : this.add_data(data) );
  }

  get_query(condition)
  {
    var sql = 'SELECT Year, COUNT(*) FROM us_accidents WHERE ' + condition + ' GROUP BY Year ORDER BY Year;';
    return {query: sql, n_queries: 1};
  }

  annotate()
  {
    if (annotation_checked)
    {
      d3.select('#tooltip').select('h4').html('Filter Widget View');
      d3.select('#tooltip').select('p').html('A horizontal bar chart of accident counts <b>(in thousands)</b> over the 6 years.');
    }
  }

}

class FilterWeatherView extends FilterWidgetView
{
  constructor()
  {
    var weathers = ['Visibility', 'Thunder', 'Snow', 'Rain', 'Cloudy'];
    var get_attribute = d => weathers.indexOf(d.Weather);

    super('filter-weather-view', weathers, get_attribute);

    this.y_shift = 5;
    this.bar_height = 21;

  }

  process_data(data)
  {
    return this.attributes.map(a => {
      var count = data[0]['SUM(' + a + ')'];
      return {'Weather' : a, 'COUNT(*)' : (count === null) ? 0 : count}
    });
  }

  condition_fn(i)
  {
    return this.attributes[i] + ' = 1';
  }

  get_query(condition)
  {
    var sql = 'SELECT SUM(Cloudy), SUM(Rain), SUM(Snow), SUM(Thunder), SUM(Visibility) FROM us_accidents WHERE ' + condition + ';';
    return {query: sql, n_queries: 1};
  }

  annotate()
  {
    if (annotation_checked)
    {
      d3.select('#tooltip').select('h4').html('Filter Widget View');
      d3.select('#tooltip').select('p').html('A horizontal bar chart of accident counts <b>(in thousands)</b> for 5 weather conditions.');
    }
  }

}
