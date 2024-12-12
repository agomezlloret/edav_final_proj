// Dimensions and margins
const width = 960, height = 500;

// Append SVG container
const svg = d3.select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Load map data (GeoJSON) and runner data
Promise.all([
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
  d3.csv("https://raw.githubusercontent.com/agomezlloret/edav_final_proj/main/marathon_data_clean.csv")
]).then(([worldData, runnerData]) => {
  // Aggregate runner data by country
  const countryStats = d3.rollups(
    runnerData,
    v => ({
      avgPace: d3.mean(v, d => {
        const paceParts = d.pace.split(":");
        return +paceParts[0] + paceParts[1] / 60; // Convert pace to decimal minutes
      }),
      count: v.length
    }),
    d => d.countryCode
  );

  const paceByCountry = new Map(countryStats.map(([key, value]) => [key, value.avgPace]));
  const countByCountry = new Map(countryStats.map(([key, value]) => [key, value.count]));

  // Color scale
  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain(d3.extent([...paceByCountry.values()]));

  // Draw map
  svg.append("g")
    .selectAll("path")
    .data(worldData.features)
    .enter()
    .append("path")
    .attr("d", d3.geoPath().projection(d3.geoNaturalEarth1().scale(160).translate([width / 3, height / 2]))) // Move map to the left
    .attr("fill", d => {
      const pace = paceByCountry.get(d.id); // Use `d.id` to match countryCode
      return pace ? colorScale(pace) : "#ccc"; // Gray for countries without data
    })
    .style("stroke", "#fff")
    .on("mouseover", (event, d) => {
      const pace = paceByCountry.get(d.id);
      const count = countByCountry.get(d.id);
      tooltip.style("display", "block")
        .html(`
          <strong>${d.properties.name}</strong><br>
          Average Pace: ${pace ? pace.toFixed(2) + " min/mile" : "No data"}<br>
          Runners: ${count || "No data"}
        `);
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));

  // Tooltip
  const tooltip = d3.select("body").append("div")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "5px")
    .style("display", "none");

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 200}, 20)`); // Move legend further to the right

  const legendScale = d3.scaleLinear()
    .domain(colorScale.domain())
    .range([0, 100]);

  const legendAxis = d3.axisRight(legendScale)
    .ticks(5)
    .tickFormat(d => `${d.toFixed(2)} min/mile`);

  legend.selectAll("rect")
    .data(d3.range(0, 101, 1))
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", d => d)
    .attr("width", 20)
    .attr("height", 1)
    .style("fill", d => colorScale(legendScale.invert(d)));

  legend.append("g")
    .attr("transform", "translate(20, 0)")
    .call(legendAxis);
});
