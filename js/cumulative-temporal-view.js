
class CumulativeTemporalView
{
  constructor(id, margin_left, full_width, unit, times, time_to_index, index_to_time)
  {

    this.id = id;
    this.margin_left = margin_left;
    this.full_width = full_width;
    this.unit = unit;
    this.times = times;
    this.time_to_index = time_to_index;
    this.index_to_time = index_to_time;

    this.margin = {top: 10, right: 1, bottom: 27, left: this.margin_left};
    this.width = this.full_width - this.margin.left - this.margin.right;
    this.height = 200 - this.margin.top - this.margin.bottom;

    this.x = d3.scaleBand().range([0, this.width]);
    this.y = d3.scaleLinear().range([this.height, 0]);

    this.svg = d3.select('#' + this.id)
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    this.actives = this.times.map(t => false);

    this.x.domain(this.times);
    this.y.domain([0, 1]);

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
        .call(d3.axisLeft(this.y));

    this.scale = 0.001;
  }

  make_gridlines(num_lines)
  {
    for (var i = 1; i <= num_lines; i++)
    {
      var y = (this.height / (num_lines + 1)) * i;
      var data = [{x : 0, y : y}, {x : this.width, y : y}];

      var gridline = d3.line().x(d => d.x).y(d => d.y);

      this.svg.append('path')
              .data([data])
              .attr('stroke', 'rgb(200,200,200)')
              .attr('stroke-dasharray', '5,5')
              .attr('d', gridline);
    }
  }

  init_graph(data)
  {

    this.make_gridlines(10);

    this.svg.selectAll(this.id + '-rects')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', this.id + '-rect')
            .attr('id', d => this.id + '-rect-' + this.time_to_index(d))
            .attr('x', d => this.x(this.times[this.time_to_index(d)]) + 3)
            .attr('y', d => this.y(0))
            .attr('width', 12)
            .attr('height', 0)
            .attr('fill', 'rgb(215,230,226)')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('opacity', 1)
            .on('mouseover', (e,d) => this.highlight_rect(d.Time))
            .on('mouseout', (e,d) => this.reset_highlight_rect())
            .on('click', (e,d) => this.activate_filter(d.Time));

    this.add_data(data);
  }

  highlight_rect(time)
  {
    d3.selectAll('.' + this.id + '-rect').attr('fill', 'rgb(215,230,226)');
    d3.select('#' + this.id + '-rect-' + time).attr('fill', 'rgb(205,220,216)').attr('cursor', 'pointer');
  }

  reset_highlight_rect()
  {
    d3.selectAll('.' + this.id + '-rect').attr('fill', 'rgb(215,230,226)');
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
        if (a) condition += ' OR ' + this.unit + ' = ' + this.index_to_time(i);
      });
    }

    database.receive_filter(this.id, condition);
  }

  add_data(data)
  {

    var all_data = this.times.map(t => 0)

    data.forEach(d => {
      all_data[this.time_to_index(d)] = parseInt(d['COUNT(*)']);
    });

    all_data = all_data.map((d,i) => {return {'Time' : i, 'Count' : d};})

    this.y.domain([0, Math.max(this.scale, d3.max(all_data.map(d => this.scale * d.Count)))]);
    d3.select('#' + this.id + '-y-axis').transition().duration(1000).call(d3.axisLeft(this.y));

    d3.selectAll('.' + this.id + '-rect')
      .data(all_data)
      .transition()
      .duration(1000)
      .attr('y', d => this.y(this.scale * d.Count))
      .attr('height', d => this.height - this.y(this.scale * d.Count));
  }

  get_query(condition)
  {
    var sql = 'SELECT ' + this.unit + ', COUNT(*) FROM us_accidents WHERE ' + condition + ' GROUP BY ' + this.unit + ' ORDER BY ' + this.unit + ';';
    return {query: sql, n_queries: 1};
  }

  receive_query_results(data, init)
  {
    (init) ? this.init_graph(data[0]) : this.add_data(data[0]);
  }

}

class CumulativeMonthView extends CumulativeTemporalView
{
  constructor()
  {
    var id = 'cumulative-month-view';
    var margin_left = 30;
    var full_width = 235;
    var unit = 'Month';
    var times = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var time_to_index = d => parseInt(d.Month) - 1;
    var index_to_time = i => i+1;

    super(id, margin_left, full_width, unit, times, time_to_index, index_to_time);

  }

  annotate()
  {
    if (annotation_checked)
    {
      d3.select('#tooltip').select('h4').html('Cumulative Temporal View');
      d3.select('#tooltip').select('p').html('A bar chart of accident counts <b>(in thousands)</b> over 12 months.');
    }
  }

}

class CumulativeWeekView extends CumulativeTemporalView
{
  constructor()
  {

    var id = 'cumulative-week-view';
    var margin_left = 30;
    var full_width = 150;
    var unit = 'Day_of_Week';
    var times = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var time_to_index = d => parseInt(d.Day_of_Week);
    var index_to_time = i => i;

    super(id, margin_left, full_width, unit, times, time_to_index, index_to_time);
  }

  annotate()
  {
    if (annotation_checked)
    {
      d3.select('#tooltip').select('h4').html('Cumulative Temporal View');
      d3.select('#tooltip').select('p').html('A bar chart of accident counts <b>(in thousands)</b> over 7 days of the week.');
    }
  }

}

class CumulativeDayView extends CumulativeTemporalView
{
  constructor()
  {

    var id = 'cumulative-day-view';
    var margin_left = 30
    var full_width = 100;
    var unit = 'Time_of_Day';
    var times = ['Mor', 'Aft', 'Eve', 'Night'];
    var time_to_index = d => parseInt(d.Time_of_Day);
    var index_to_time = i => i;

    super(id, margin_left, full_width, unit, times, time_to_index, index_to_time);
  }

  annotate()
  {
    if (annotation_checked)
    {
      d3.select('#tooltip').select('h4').html('Cumulative Temporal View');
      d3.select('#tooltip').select('p').html('A bar chart of accident counts <b>(in thousands)</b> over 4 times of the day.');
    }
  }
}
