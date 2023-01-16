
var map_view;
var hotspot_view;
var cumulative_month_view;
var cumulative_week_view;
var cumulative_day_view;
var global_temporal_view;
var filter_year_view;
var filter_weather_view;
var ranking_type_view;
var radial_type_view;
var database;
var pyodide_promise;

var mouse_x;
var mouse_y;
var annotation_checked;

var show_sql;

async function start_pyodide()
{
  pyodide = await loadPyodide();
  await pyodide.loadPackage('numpy');
  await pyodide.loadPackage('scikit-learn');
  return pyodide;
}

function annotation_check(checked)
{
  annotation_checked = checked;

  if (annotation_checked)
  {
    document.getElementById('tooltip').style.opacity = '1';
    document.getElementById('tooltip').style.maxWidth = 'initial';
    document.getElementById('tooltip').style.maxHeight = 'initial';
    set_tooltip();
  }
  else
  {
    document.getElementById('tooltip').style.opacity = '0';
    document.getElementById('tooltip').style.maxWidth = '0';
    document.getElementById('tooltip').style.maxHeight = '0';
  }
}

function get_mouse_coords(e)
{
  mouse_x = e.clientX;
  mouse_y = e.clientY;

  if (annotation_checked) set_tooltip();
}

function set_tooltip()
{
  document.getElementById('tooltip').style.top = 20 + document.documentElement.scrollTop + mouse_y + 'px';
  document.getElementById('tooltip').style.left = -115 + document.documentElement.scrollLeft + mouse_x + 'px';
}

function title_annotate()
{
  d3.select('#tooltip').select('h4').html('CSE 578 Final Project');
  d3.select('#tooltip').select('p').html('<b>By:</b> Kyle Otstot, Shreyash Gade, Jaswanth Reddy Tokala, Anudeep Reddy Dasari, Hruthik Reddy Sunnapu, Nitesh Valluru');
}

function reset_annotation()
{
  if (annotation_checked)
  {
    d3.select('#tooltip').select('h4').html('Graph Annotation Tooltip');
    d3.select('#tooltip').select('p').html('Hover over a view to see annotations.');
  }
}

document.addEventListener('DOMContentLoaded', function () {

  document.body.addEventListener('mousemove', get_mouse_coords, false);
  document.addEventListener('scroll', set_tooltip, false);

  show_sql = false;

  pyodide_promise = start_pyodide();

  map_view = new MapView();

  hotspot_view = new HotspotView();

  cumulative_month_view = new CumulativeMonthView();
  cumulative_week_view = new CumulativeWeekView();
  cumulative_day_view = new CumulativeDayView();

  global_temporal_view = new GlobalTemporalView();

  filter_year_view = new FilterYearView();
  filter_weather_view = new FilterWeatherView();

  ranking_type_view = new RankingTypeView();

  radial_type_view = new RadialTypeView();

  database = new Database();


});
