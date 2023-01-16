

class MapView
{
  constructor()
  {

    this.create_map();
    this.id_to_state = this.create_id_to_state();
    this.current_regions = null;
    this.legend_gradient = null;
    this.state_view = true;
    this.cropped = false;
    this.drawing = false;

  }

  create_id_to_state()
  {
    var states = L.geoJson(us_states);

    var id_to_state = {};

    states.eachLayer(function(layer)
    {
      id_to_state[layer.feature.properties.STATE] = layer.feature.properties.NAME;
    });

    return id_to_state;
  }

  prepare_layer_group(regions, filter, on_each_feature, data)
  {
    var json = L.geoJson(regions, {filter: filter,
                                        onEachFeature: on_each_feature
                                      });

    var max_count = 0;
    var id_to_state = this.id_to_state;

    json.eachLayer(function(layer)
    {
      var key = layer.feature.properties.NAME + ',' + id_to_state[layer.feature.properties.STATE];
      var count = data[key];
      max_count = (count > max_count) ? count : max_count;
    });

    var color_scale = d3.scaleSequentialSqrt([0, max_count], d3.interpolateYlOrRd);
    var color_map = function(x) { return (x != null) ? color_scale(x) : color_scale(0)};

    if (this.legend_gradient === null)
    {
      this.legend_gradient = d3.select('#mv-legend').append('defs')
                                                    .append('linearGradient')
                                                    .attr('id', 'mv-legend-gradient')
                                                    .attr('x1', '0%')
                                                    .attr('y1', '0%')
                                                    .attr('x2', '0%')
                                                    .attr('y2', '100%');

      for (var i = 0; i <= 10; i++)
      {
        var count = max_count * (1 - i / 10);
        var offset = (10 * i) + '%';
        var color = color_map(count);

        this.legend_gradient.append('stop')
            .attr('offset', offset)
            .attr('stop-color', color);
      }

      d3.select('#mv-legend').append('rect')
                            .attr('x', '0')
                            .attr('y', '10')
                            .attr('width', '15')
                            .attr('height', '100')
                            .attr('fill', 'url(#mv-legend-gradient)')
                            .attr('fill-opacity', '0.7');

      this.legend_scale = d3.scaleSequentialSqrt().range([110, 10]).domain([0, max_count/1000]);

      d3.select('#mv-legend').append('g')
                            .attr('id', 'mv-legend-axis')
                            .attr('transform', 'translate(10,0)')
                            .call(d3.axisRight(this.legend_scale).ticks(5))
                            .select('.domain')
                            .attr('opacity', '0');
    }
    else
    {
      this.legend_scale = d3.scaleSequentialSqrt().range([110, 10]).domain([0, max_count/1000]);
      d3.select('#mv-legend-axis').transition().duration(1000)
                                  .call(d3.axisRight(this.legend_scale).ticks(5));
    }

    json.eachLayer(function(layer)
    {
      layer.setStyle({
        fillColor : color_map(data[layer.feature.properties.NAME + ',' + id_to_state[layer.feature.properties.STATE]]),
        weight: 2,
        opacity: 1,
        color: 'black',
        fillOpacity: 0.7
      });
    });

    return json;

  }

  add_county_data(data)
  {
    this.county_data = {}

    data.forEach(d => {
      var key = region_dict['counties'][parseInt(d.County)] + ',' + region_dict['states'][parseInt(d.State)]
      this.county_data[key] = parseInt(d['COUNT(*)']);
    });

  }

  add_state_data(data)
  {
    this.state_data = {}

    data.forEach(d => {
      var key = region_dict['states'][parseInt(d.State)]
      this.state_data[key + ',' + key] = parseInt(d['COUNT(*)']);
    });

  }

  add_data_to_map()
  {
    if (this.current_regions != null) this.map.removeLayer(this.current_regions);

    if (this.state_view)
    {
      if (this.cropped)
      {
        var rect_bounds = this.rect_bounds;
        var filter = function(feature) { return initial_states(feature) && bounds_by_crop(feature, rect_bounds)};
        this.crop_states = this.prepare_layer_group(us_states, filter, this.on_state_view, this.state_data);
        this.current_regions = this.crop_states;
      }
      else
      {
        this.states = this.prepare_layer_group(us_states, initial_states, this.on_state_view, this.state_data);
        this.current_regions = this.states;
      }
    }
    else
    {
      if (this.cropped)
      {
        var rect_bounds = this.rect_bounds;
        var filter = function(feature) { return counties_by_state_id(feature, map_view.state_id) && bounds_by_crop(feature, rect_bounds)};
        this.crop_counties = this.prepare_layer_group(us_counties, filter, this.on_county_view, this.county_data);
        this.current_regions = this.crop_counties;
      }
      else
      {
        var state_id = this.state_id;
        var filter = function(feature) {return counties_by_state_id(feature, state_id)};
        this.counties = this.prepare_layer_group(us_counties, filter, this.on_county_view, this.county_data);
        this.current_regions = this.counties
      }
    }

    this.current_regions.addTo(this.map);

  }

  create_map()
  {
    this.map = L.map('map-view').setView([37.8, -96], 4);

  	var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                              {
                            		maxZoom: 19,
                            		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  	                          }).addTo(this.map);
    var draw_options = {
                          position: 'topleft',
                          draw: {
                                  polyline: false,
                                  polygon: false,
                                  circle: false,
                                  rectangle: {
                                                shapeOptions: {
                                                clickable: false,
                                                stroke: true,
                                                color: 'black',
                                                weight: 2,
                                                fill: true,
                                                fillColor: 'black',
                                                fillOpacity: 0.2,
                                              },
                                            },
                                  marker: false
                                },
                          edit: false
                          };

    this.map.addControl(new L.Control.Draw(draw_options));

    this.map.on('draw:drawstart', e => {this.drawing = true});
    this.map.on('draw:drawstop', e => this.drawing = false);
    this.map.on('draw:created', on_draw);


    this.info = L.control();

    this.info.onAdd = function (map)
    {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
    };

    this.info.update = function (props)
    {
      if (props)
      {
        var count = ((map_view.state_view) ? map_view.state_data[props.NAME + ',' + map_view.id_to_state[props.STATE]]
                        : map_view.county_data[props.NAME + ',' + map_view.id_to_state[props.STATE]]);
      }
      this._div.innerHTML = '<h4>US Accident Counts</h4>' +  (props ?
          '<b>' + props.NAME + ':</b> ' + ((count) ? count : 0)
          : 'Hover over a region');
    };

    this.info.addTo(this.map);

    this.legend = L.control({position: 'bottomright'});

    this.legend.onAdd = function (map)
    {
        this._div = L.DomUtil.create('div', 'info');
        this._div.style.padding = '3px 5px 0px 5px';
        this._div.innerHTML = '<svg id="mv-legend" height="120" width="40"></svg>';
        return this._div;
    };

    this.legend.addTo(this.map);

  }

  record_active_layers()
  {
    var active_layers = {};

    var layer_group = (this.state_view) ? this.states : this.counties;

    layer_group.eachLayer(function (layer) {
      active_layers[layer.feature.properties.GEO_ID] = layer;
    });

    this.active_layers = active_layers;
  }

  crop_bounds(rect_bounds)
  {
    this.cropped = true;
    d3.select('.leaflet-draw-draw-rectangle').style('max-width', '0');
    d3.select('.leaflet-draw-toolbar-top').style('opacity', '0');

    this.rect_bounds = rect_bounds;
    this.record_active_layers();

    if (this.state_view)
    {
      this.add_data_to_map();

      var crop_state_names = []
      this.crop_states.eachLayer(layer => { crop_state_names.push(layer.feature.properties.NAME)});
      this.send_filter({'state' : crop_state_names});
    }
    else
    {
      this.add_data_to_map();

      var crop_county_names = []
      this.crop_counties.eachLayer(layer => { crop_county_names.push(layer.feature.properties.NAME)});
      this.send_filter({'state' : [this.id_to_state[this.state_id]], 'county' : crop_county_names});
    }

    this.map.fitBounds(this.current_regions.getBounds());

    this.add_crop_tab();
  }

  on_state_view(feature, layer)
  {
    layer.on({
      click: set_county_view,
      mouseover: highlight_region,
      mouseout: reset_highlight
    });
  }

  on_county_view(feature, layer)
  {
    layer.on({
      mouseover: highlight_region,
      mouseout: reset_highlight
    });
  }

  to_state_view()
  {
    if (this.crop_tab != null)
    {
      this.map.removeControl(this.crop_tab);
      this.crop_tab = null;
    }

    this.map.removeControl(this.county_tab);

    this.state_view = true;
    this.cropped = false;

    this.add_data_to_map();

    this.map.flyTo([37.8, -96], 4);


    map_view.send_filter({});
  }

  to_county_view(bounds, state)
  {
    this.state_view = false;
    this.cropped = false;

    d3.select('.leaflet-draw-draw-rectangle').style('max-width', 'initial');
    d3.select('.leaflet-draw-toolbar-top').style('opacity', '1');

    this.add_data_to_map();

    this.map.fitBounds(bounds);

    this.add_county_tab(state);

    this.send_filter({'state' : [state]});
  }

  to_uncrop_view()
  {
    this.cropped = false;
    d3.select('.leaflet-draw-draw-rectangle').style('max-width', 'initial');
    d3.select('.leaflet-draw-toolbar-top').style('opacity', '1');

    this.map.removeControl(this.crop_tab);

    this.add_data_to_map();

    if (this.state_view)
    {
      this.map.flyTo([37.8, -96], 4);
      this.send_filter({});
    }
    else
    {
      this.map.fitBounds(this.current_regions.getBounds());
      this.send_filter({'state' : [this.id_to_state[this.state_id]]});
    }
  }

  add_crop_tab()
  {
    this.crop_tab = L.control({position: 'bottomleft'});

    this.crop_tab.onAdd = function (map)
    {
        var div = L.DomUtil.create('div', 'info mv-tab');
        var x_button = '<span onhover="" onclick="map_view.to_uncrop_view()" style="font-size:15px;">&#x2715;</span>'
        div.innerHTML = 'Cropped region &nbsp' + x_button;
        return div;
    };

    this.crop_tab.addTo(this.map);
  }

  add_county_tab(state)
  {

    if (this.crop_tab != null)
    {
      this.map.removeControl(this.crop_tab);
      this.crop_tab = null;
    }

    this.county_tab = L.control({position: 'bottomleft'});

    this.county_tab.onAdd = function (map)
    {
        var div = L.DomUtil.create('div', 'info mv-tab');
        var x_button = '<span onhover="" onclick="map_view.to_state_view()" style="font-size:15px;">&#x2715;</span>'
        div.innerHTML = 'County view of <b>' + state + '</b> &nbsp' + x_button;
        return div;
    };

    this.county_tab.addTo(this.map);
  }

  send_filter(filter)
  {

    var filters = {
                'state' : (filter['state'] === undefined) ? [] : filter['state'],
                'county' : (filter['county'] === undefined) ? [] : filter['county'],
              };

    var state_num = (filters['state'].length == 0) ? 1 : 0
    var county_num = (filters['county'].length == 0) ? 1 : 0

    var condition = '(' + state_num + ' ';

    filters['state'].forEach(s => {
      condition += 'OR State = ' + region_dict['states'].indexOf(s) + ' ';
    });

    condition += ') AND (' + county_num + ' ';

    filters['county'].forEach(c => {
      condition += 'OR County = ' + region_dict['counties'].indexOf(c) + ' ';
    });

    condition += ')';

    database.receive_filter('map-view', condition);
  }

  query_data(condition, init)
  {
    var sql_command = 'SELECT State, COUNT(*) FROM us_accidents WHERE ' + condition + ' GROUP BY State';

    if (show_sql) console.log(sql_command);

    d3.json('php/query.php?SQL=' + sql_command).then(data =>
    {
      this.add_state_data(data);
      var sql_command = 'SELECT County, State, COUNT(*) FROM us_accidents WHERE ' + condition + ' GROUP BY County, State';
      d3.json('php/query.php?SQL=' + sql_command).then(data =>
      {
        this.add_county_data(data);
        this.add_data_to_map();
        var map_cond = '(' + database.filters['map-view'] + ')';
        hotspot_view.add_regions(map_cond + ' AND (' + condition + ')', init);
        radial_type_view.add_regions(map_cond + ' AND (' + condition + ')');
      });
    });
  }

  get_query(condition)
  {
    var sql1 = 'SELECT State, COUNT(*) FROM us_accidents WHERE ' + condition + ' GROUP BY State;';
    var sql2 = 'SELECT County, State, COUNT(*) FROM us_accidents WHERE ' + condition + ' GROUP BY County, State;';
    return {query: sql1 + sql2, n_queries: 2};
  }

  receive_query_results(data, init)
  {
    this.add_state_data(data[0]);
    this.add_county_data(data[1]);
    this.add_data_to_map();
  }

  annotate()
  {
    if (annotation_checked)
    {
      d3.select('#tooltip').select('h4').html('Map View');
      d3.select('#tooltip').select('p').html('A spatial distribution of accident instances <br> <b>(in thousands)</b> for regions.');
    }
  }


}

// Filtering functions

function initial_states(feature)
{
  var state = feature.properties.NAME;
  return state != 'Alaska' && state != 'Hawaii' && state != 'Puerto Rico';
}

function counties_by_state_id(feature, state_id)
{
  var id = feature.properties.STATE;
  return id === state_id;
}

function bounds_by_crop(feature, rect_bounds)
{
  var bounds = map_view.active_layers[feature.properties.GEO_ID].getBounds();

  var y_t = bounds._northEast.lat, y_b = bounds._southWest.lat;
  var x_r = bounds._northEast.lng, x_l = bounds._southWest.lng;

  var rect_y_t = rect_bounds._northEast.lat, rect_y_b = rect_bounds._southWest.lat;
  var rect_x_r = rect_bounds._northEast.lng, rect_x_l = rect_bounds._southWest.lng;

  if ((rect_x_l < x_l && rect_x_r < x_l) || (rect_x_l > x_r && rect_x_r > x_r))
  {
    return false;
  }

  if ((rect_y_t > y_t && rect_y_b > y_t) || (rect_y_t < y_b && rect_y_b < y_b))
  {
    return false;
  }

  return true;

}


function on_draw(e)
{
  var rect_bounds = e.layer.getBounds();

  map_view.crop_bounds(rect_bounds);

}

function set_county_view(e)
{
  e.target.setStyle({
        weight: 2,
        fillOpacity: 0.7
    });

  var state = e.target.feature.properties.NAME;
  var bounds = e.target.getBounds();

  map_view.state_id = e.target.feature.properties.STATE;
  map_view.to_county_view(bounds, state);
}

function highlight_region(e)
{
  var layer = e.target;

  map_view.info.update(layer.feature.properties);

  if (!map_view.drawing)
  {
    layer.setStyle({
          weight: 4,
          fillOpacity: 0.9,
      });

    layer.getElement().style.cursor = (map_view.state_view) ? 'pointer' : 'default';

    layer.bringToFront();
  }
  else
  {
    layer.getElement().style.cursor = 'crosshair';
  }
}

function reset_highlight(e)
{
  map_view.info.update();

  e.target.setStyle({
        weight: 2,
        fillOpacity: 0.7
    });
}
