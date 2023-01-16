

class RankingTypeView
{
  constructor()
  {
    this.margin = {top: 10, right: 60, bottom: 25, left: 90},
    this.width = 950 - this.margin.left - this.margin.right,
    this.height = 150 - this.margin.top - this.margin.bottom;

    this.parseDate = d3.timeParse('%m/%Y');

    this.x = d3.scaleTime().range([0, this.width]);
    this.y = d3.scaleBand().range([this.height, 0]);

    this.y_rank = d3.scaleBand().range([this.height, 0])
                    .domain(['5th', '4th', '3rd', '2nd', '1st']);

    this.svg = d3.select('#ranking-type-view')
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    this.weathers = ['Visibility', 'Thunder', 'Snow', 'Rain', 'Cloudy'];

    this.x.domain([this.parseDate('01/2016'), this.parseDate('12/2021')]);
    this.y.domain(this.weathers.map(w => w.toUpperCase()));

    this.y_shift = 11.5;

    this.color = d3.scaleOrdinal(d3.schemeSet2);

    this.svg.append('g')
        .attr('class', 'axis')
        .attr('id', 'rtv-x-axis')
        .attr('transform', 'translate(0,' + this.height + ')')
        .call(d3.axisBottom(this.x));

    this.svg.append('g')
        .attr('class', 'axis')
        .attr('id', 'rtv-y-rank-axis')
        .attr('transform', 'translate(' + this.width + ',0)')
        .call(d3.axisRight(this.y_rank))
        .selectAll('.domain')
        .attr('opacity', '0');

    this.svg.append('g')
        .attr('class', 'axis')
        .attr('id', 'rtv-y-axis');

    d3.select('#rtv-y-axis')
        .append('rect')
        .attr('x', '-100')
        .attr('y', '0')
        .attr('width', '100')
        .attr('height', '120')
        .attr('fill', 'white');

    d3.select('#rtv-y-axis')
      .call(d3.axisLeft(this.y))
      .selectAll('.domain')
      .attr('opacity', '0');

    d3.select('#rtv-y-axis')
      .selectAll('text')
      .attr('id', (d,i) => 'rtv-y-axis-text-' + this.weathers[i].toUpperCase())
      .attr('class', 'hoverable')
      .attr('fill', (d,i) => this.color(i))
      .on('mouseover', (e, w) => this.highlight_weather(w));

    d3.select('#rtv-y-axis').select('rect').on('mouseout', e => this.reset_highlight_weather());

    d3.select('#rtv-y-axis')
      .selectAll('line')
      .attr('id', (d,i) => 'rtv-y-axis-line-' + this.weathers[i].toUpperCase())
      .attr('stroke', (d,i) => this.color(i))
      .attr('stroke-width', '2');

    this.scale = 0.001;
  }

  highlight_weather(w)
  {
    d3.select('#rtv-y-axis').selectAll('text, line').attr('opacity', '0.2');
    d3.select('#rtv-y-axis-text-' + w).attr('opacity', '1');
    d3.select('#rtv-y-axis-line-' + w).attr('opacity', '1');
    d3.selectAll('.rtv-line').attr('opacity', '0.2');
    d3.select('#rtv-line-' + w).attr('opacity', '1');
  }

  reset_highlight_weather()
  {
    d3.select('#rtv-y-axis').selectAll('text, line').attr('opacity', '1');
    d3.selectAll('.rtv-line').attr('opacity', '1');
  }

  key(weather)
  {
    return 'SUM(' + weather + ' * Distance) / SUM(' + weather + ')';
  }

  rank(d)
  {
    var values = this.weathers.map(w => {return {'weather' : w, 'value' : parseFloat(d[this.key(w)])}});
    var sorted = values.sort((a,b) => (isNaN(b.value)) ? 1 : (isNaN(a.value)) ? -1 : a.value - b.value);
    var new_d = {'Month' : d.Month, 'Year' : d.Year};

    sorted.forEach((s,i) => {
      new_d[s.weather] = i;
    });

    return new_d;
  }

  init_graph(orig_data)
  {
    var data = orig_data.map(d => this.rank(d));
    var data_map = w => data.map(d => { return {'Month' : d.Month, 'Year' : d.Year, 'Rank' : d[w]} });

    var init_line = w => d3.line().x(d => this.x(this.parseDate(d.Month + '/' + d.Year))).y(d => this.y(w.toUpperCase()) + this.y_shift);

    this.weathers.forEach((weather, i) => {

      this.svg.append('path')
        .data([data_map(weather)])
        .attr('class', 'rtv-line')
        .attr('id', 'rtv-line-' + weather.toUpperCase())
        .attr('stroke', this.color(i))
        .attr('stroke-width', '2')
        .attr('fill', 'transparent')
        .attr('d', init_line(weather));

    });

    this.base_data = {}
    data.forEach(d => {
      this.base_data[d.Month + ',' + d.Year] = {};
      this.weathers.forEach(w => { this.base_data[d.Month + ',' + d.Year][w] = 0});
    })

    this.add_data(orig_data);

  }

  add_data(new_data)
  {

    var data_dict = JSON.parse(JSON.stringify(this.base_data))

    new_data.forEach(d =>
    {
      data_dict[d.Month + ',' + d.Year] = {};
      this.weathers.forEach(w => {
        data_dict[d.Month + ',' + d.Year][w] = d[this.key(w)];
      });
    });

    var orig_data = []
    for (let key in data_dict) {
      var nums = key.split(',');
      var entry_dict = {'Month' : nums[0], 'Year' : nums[1]};
      this.weathers.forEach(w => {
        entry_dict[this.key(w)] = data_dict[key][w];
      });
      orig_data.push(entry_dict);
    }

    var data = []
    for (let key in data_dict) {
      var nums = key.split(',');
      data.push({'Month' : nums[0], 'Year' : nums[1], 'COUNT(*)' : data_dict[key]});
    }

    var data = orig_data.map(d => this.rank(d));
    var ranks = this.weathers.map(w => {return {'weather' : w, 'rank' : data[0][w]}});
    var ranked_weathers = ranks.sort((a,b) => a.rank - b.rank).map(r => r.weather);

    this.y.domain(ranked_weathers.map(w => w.toUpperCase()));
    d3.select('#rtv-y-axis').transition().duration(1000).call(d3.axisLeft(this.y));

    var data_map = w => data.map(d => { return {'Month' : d.Month, 'Year' : d.Year, 'Rank' : d[w]} });

    var line = d3.line()
                  .x(d => this.x(this.parseDate(d.Month + '/' + d.Year)))
                  .y(d => this.y(ranked_weathers[d.Rank].toUpperCase()) + this.y_shift);

    this.weathers.forEach(weather => {

      d3.select('#rtv-line-' + weather.toUpperCase())
        .data([data_map(weather)])
        .transition()
        .duration(1000)
        .attr('d', line);

    });

  }

  query_data(condition, init)
  {
    var sql_command = 'SELECT Year, Month, SUM(Cloudy * Distance) / SUM(Cloudy), SUM(Rain * Distance) / SUM(Rain), \
     SUM(Snow * Distance) / SUM(Snow), SUM(Thunder * Distance) / SUM(Thunder), \
     SUM(Visibility * Distance) / SUM(Visibility) FROM us_accidents WHERE ' + condition + ' GROUP BY Year, Month ORDER BY Year, Month';

    if (show_sql) console.log(sql_command);

    d3.json('php/query.php?SQL=' + sql_command).then(data => (init) ? this.init_graph(data) : this.add_data(data) );
  }

  get_query(condition)
  {
    var sql = 'SELECT Year, Month, SUM(Cloudy * Distance) / SUM(Cloudy), SUM(Rain * Distance) / SUM(Rain), \
     SUM(Snow * Distance) / SUM(Snow), SUM(Thunder * Distance) / SUM(Thunder), \
     SUM(Visibility * Distance) / SUM(Visibility) FROM us_accidents WHERE ' + condition + ' GROUP BY Year, Month ORDER BY Year, Month;';
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
      d3.select('#tooltip').select('h4').html('Ranking Type View');
      d3.select('#tooltip').select('p').html('A line chart of each weather condition\'s accident severity rank (<b>1st:</b> longest average road closure) over time.');
    }
  }

}
