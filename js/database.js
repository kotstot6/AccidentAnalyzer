
class Database
{
  constructor()
  {
    this.views = {
      'map-view' : map_view,
      'hotspot-view' : hotspot_view,
      'cumulative-month-view' : cumulative_month_view,
      'cumulative-week-view' : cumulative_week_view,
      'cumulative-day-view' : cumulative_day_view,
      'global-temporal-view' : global_temporal_view,
      'filter-year-view' : filter_year_view,
      'filter-weather-view' : filter_weather_view,
      'ranking-type-view' : ranking_type_view,
      'radial-type-view' : radial_type_view
    };

    this.filters = {};

    for (let key in this.views)
    {
      this.filters[key] = '1';
    }

    this.receive_filter('#', '1', true);

  }

  create_condition(key)
  {
    var condition = '1';

    for (let k in this.filters)
    {
      if (key != k)
      {
        condition += ' AND (' + this.filters[k] + ')';
      }
    }

    return condition;
  }

  receive_filter(key, condition, init)
  {

    init = (init === undefined) ? false : init;

    if (key in this.filters) this.filters[key] = condition;

    var query_views = [];
    var sql_query = '';

    for (let k in this.views)
    {
      if (key != k)
      {
        var condition = this.create_condition(k);
        var query_info = this.views[k].get_query(condition);
        sql_query +=  query_info.query;
        query_views.push({view: this.views[k], n_queries: query_info.n_queries});
      }
    }

    if (show_sql) console.log(sql_query);

    d3.select('#loading-panel-text').html((init) ? 'Loading' : 'Filtering');
    d3.select('#loading-panel').style('max-height', 'initial').style('max-width', 'initial');

    d3.json('php/query.php?SQL=' + sql_query).then(data =>
    {
      d3.select('#loading-panel').style('max-height', '0').style('max-width', '0');

      var index = 0;
      query_views.forEach(qv => {

        var view_data = [];

        for (var i = 0; i < qv.n_queries; i++)
        {
          view_data.push(data[index]);
          index++;
        }

        setTimeout(e => qv.view.receive_query_results(view_data, init, key), index * 1000);
      });

    });

  }
}
