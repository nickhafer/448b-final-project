// Load and process the data
d3.csv("data/ufo-sightings-transformed.csv").then((data) => {
  // Parse dates and numeric values
  data.forEach((d) => {
    d.Date_time = new Date(d.Date_time);
    d.latitude = +d.latitude;
    d.longitude = +d.longitude;
    d.length_of_encounter_seconds = +d.length_of_encounter_seconds;
    d.hour = d.Date_time.getHours();
    d.day_of_week = getDayOfWeek(d.Date_time);
  });

  createTimelineChart(data);
  createMap(data);
  createHeatmap(data);
  createTimeOfDayChart(data);
  createSeasonChart(data);
  createmirandachart(data);
  //createShapeChart(data);
});

function getDayOfWeek(date) {
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const dayIndex = new Date(date).getDay(); // Returns 0 for Sunday, 1 for Monday, etc.
  return daysOfWeek[dayIndex];
}

function createTimelineChart(data) {
  // Group data by year
  const yearCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => d.Date_time.getFullYear()
  );

  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const width =
    document.getElementById("timeline-chart").offsetWidth -
    margin.left -
    margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3
    .select("#timeline-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain(d3.extent([...yearCounts.keys()]))
    .range([0, width]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max([...yearCounts.values()])])
    .range([height, 0]);

  // Let's first check what data we have
  console.log("Sample data point:", data[0]); // This will help us see the correct property name

  // Add filter controls
  const filterContainer = d3
    .select("#timeline-chart")
    .append("div")
    .attr("class", "filter-controls")
    .style("margin-bottom", "10px");

  // Add shape filter dropdown
  const shapes = [...new Set(data.map((d) => d.UFO_shape))];
  filterContainer
    .append("select")
    .attr("id", "shape-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(["All Shapes", ...shapes])
    .enter()
    .append("option")
    .text((d) => d);

  // Updated country filter dropdown using Country_Code
  const countryCodes = [...new Set(data.map((d) => d.Country_Code))].filter(
    (code) => code && code.trim() !== ""
  );

  // Create a mapping for country codes to full names
  const countryNames = {
    // 'USA': 'United States',
    // 'CAN': 'Canada',
    // 'GBR': 'United Kingdom',
    // 'AUS': 'Australia',
    // Add more as needed
  };

  filterContainer
    .append("select")
    .attr("id", "country-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(["All Countries", ...countryCodes])
    .enter()
    .append("option")
    .text((d) => (d === "All Countries" ? d : `${countryNames[d] || d}`));

  // Add season filter dropdown
  const seasons = ["All Seasons", "Spring", "Summer", "Fall", "Winter"];
  filterContainer
    .append("select")
    .attr("id", "season-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(seasons)
    .enter()
    .append("option")
    .text((d) => d);

  // Helper function to determine season
  function getSeason(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return "Spring";
    if (month >= 5 && month <= 7) return "Summer";
    if (month >= 8 && month <= 10) return "Fall";
    return "Winter";
  }

  // Function to filter and aggregate data
  function getFilteredData() {
    const selectedShape = d3.select("#shape-filter").node().value;
    const selectedCountry = d3.select("#country-filter").node().value;
    const selectedSeason = d3.select("#season-filter").node().value;

    let filteredData = data;

    if (selectedShape !== "All Shapes") {
      filteredData = filteredData.filter((d) => d.UFO_shape === selectedShape);
    }

    if (selectedCountry !== "All Countries") {
      filteredData = filteredData.filter(
        (d) => d.Country_Code === selectedCountry
      );
    }

    if (selectedSeason !== "All Seasons") {
      filteredData = filteredData.filter((d) => d.Season === selectedSeason); // Using the Season field from data
    }

    return d3.rollup(
      filteredData,
      (v) => v.length,
      (d) => d.Date_time.getFullYear()
    );
  }

  // Create tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "fixed")
    .style("background-color", "rgba(25, 25, 40, 0.9)")
    .style("color", "#fff")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("border", "1px solid #4CAF50")
    .style("z-index", "9999");

  function updateChart() {
    const yearCounts = getFilteredData();

    // Update scales
    x.domain(d3.extent([...yearCounts.keys()]));
    y.domain([0, d3.max([...yearCounts.values()])]);

    // Update dots
    const dots = svg.selectAll(".dot").data([...yearCounts]);

    dots.exit().remove();

    // Update existing dots
    dots
      .transition()
      .duration(750)
      .attr("cx", (d) => x(d[0]))
      .attr("cy", (d) => y(d[1]));

    // Add new dots
    dots
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("r", 4)
      .attr("fill", "#4CAF50")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("opacity", 0.8)
      .attr("cx", (d) => x(d[0]))
      .attr("cy", (d) => y(d[1]))
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("r", 6).attr("opacity", 1);

        tooltip.transition().duration(200).style("opacity", 0.9);

        tooltip
          .html(`Year: ${d[0]}<br/>Sightings: ${d[1]}`)
          .style("left", `${event.clientX + 10}px`)
          .style("top", `${event.clientY - 50}px`);
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("r", 4).attr("opacity", 0.8);

        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Update axes
    svg
      .select(".x-axis")
      .transition()
      .duration(750)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.select(".y-axis").transition().duration(750).call(d3.axisLeft(y));
  }

  // Remove the line path code and only keep the axes setup
  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  svg.append("g").attr("class", "y-axis");

  // Add X axis label
  svg
    .append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text("Year");

  // Add Y axis label
  svg
    .append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .text("Number of Sightings");

  // Initial chart render
  updateChart();
}

function createMap(data) {
  // Filter out any invalid coordinates
  const validData = data.filter((d) => {
    const isValid =
      !isNaN(d.latitude) &&
      !isNaN(d.longitude) &&
      d.latitude !== null &&
      d.longitude !== null &&
      Math.abs(d.latitude) <= 90 &&
      Math.abs(d.longitude) <= 180;
    if (!isValid) {
      console.log("Invalid data point:", d);
    }
    return isValid;
  });

  console.log("Valid data points:", validData.length);

  // Initialize the map
  const map = L.map("map").setView([39.8283, -98.5795], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // Add markers with clustering
  const markers = L.markerClusterGroup();

  validData.forEach((d) => {
    try {
      const isTruncated = d.Description.length > 100;
      const truncatedDescription = isTruncated
        ? `${d.Description.substring(0, 100)}...`
        : d.Description;

      const marker = L.marker([d.latitude, d.longitude]).bindPopup(`
                <strong>Date:</strong> ${d.Date_time.toLocaleDateString()}<br>
                <strong>Shape:</strong> ${d.UFO_shape}<br>
                <strong>Duration:</strong> ${d.Encounter_Duration}<br>
                <strong>Description:</strong> ${truncatedDescription}
                ${
                  isTruncated
                    ? '<br><a href="#" class="show-full-description">Show More</a>'
                    : ""
                }
            `);

      // Event listener to handle 'Show More' click
      marker.on("popupopen", function (e) {
        const popup = e.popup; // Get the popup that was opened
        if (isTruncated) {
          const popupContent = `
                    <strong>Date:</strong> ${d.Date_time.toLocaleDateString()}<br>
                    <strong>Shape:</strong> ${d.UFO_shape}<br>
                    <strong>Duration:</strong> ${d.Encounter_Duration}<br>
                    <strong>Description:</strong> ${d.Description}
                `;
          // Add event listener for the link to replace content
          popup
            .getElement()
            .querySelector(".show-full-description")
            .addEventListener("click", function (event) {
              event.preventDefault(); // Prevent default link behavior
              popup.setContent(popupContent); // Replace the popup's content
            });
        }
      });

      markers.addLayer(marker);
    } catch (e) {
      console.error("Error creating marker:", e, d);
    }
  });

  // Add markers to the map
  map.addLayer(markers);
}

function createHeatmap(data) {
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const width =
    document.getElementById("day-chart").offsetWidth -
    margin.left -
    margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Add filter controls
  const filterContainer = d3
    .select("#day-chart")
    .append("div")
    .attr("class", "filter-controls")
    .style("margin-bottom", "10px");

  // Add shape filter dropdown
  const shapes = [...new Set(data.map((d) => d.UFO_shape))];
  filterContainer
    .append("select")
    .attr("id", "day-shape-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(["All Shapes", ...shapes])
    .enter()
    .append("option")
    .text((d) => d);

  // Add country filter dropdown
  const countryCodes = [...new Set(data.map((d) => d.Country_Code))].filter(
    (code) => code && code.trim() !== ""
  );
  filterContainer
    .append("select")
    .attr("id", "day-country-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(["All Countries", ...countryCodes])
    .enter()
    .append("option")
    .text((d) => d);

  // Create SVG container
  const svg = d3
    .select("#day-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "fixed")
    .style("background-color", "rgba(25, 25, 40, 0.9)")
    .style("color", "#fff")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("border", "1px solid #4CAF50");

  function updateChart() {
    const selectedShape = d3.select("#day-shape-filter").node().value;
    const selectedCountry = d3.select("#day-country-filter").node().value;

    // Filter data
    let filteredData = data;
    if (selectedShape !== "All Shapes") {
      filteredData = filteredData.filter((d) => d.UFO_shape === selectedShape);
    }
    if (selectedCountry !== "All Countries") {
      filteredData = filteredData.filter(
        (d) => d.Country_Code === selectedCountry
      );
    }

    // Count by day of week
    const dayCounts = d3.rollup(
      filteredData,
      (v) => v.length,
      (d) => d.day_of_week
    );

    // Convert to array and sort by day order
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayData = days.map((day) => ({
      day: day,
      count: dayCounts.get(day) || 0,
    }));

    // Update scales
    const x = d3.scaleBand().range([0, width]).domain(days).padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(dayData, (d) => d.count)])
      .range([height, 0]);

    // Update/create bars
    const bars = svg.selectAll(".bar").data(dayData);

    // Remove old bars
    bars.exit().remove();

    // Update existing bars
    bars
      .transition()
      .duration(750)
      .attr("x", (d) => x(d.day))
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.count));

    // Add new bars
    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", "#4CAF50")
      .attr("x", (d) => x(d.day))
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.count))
      .attr("opacity", 0.8)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("opacity", 1);

        tooltip.transition().duration(200).style("opacity", 0.9);

        tooltip
          .html(`Day: ${d.day}<br>Sightings: ${d.count}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("opacity", 0.8);

        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Update axes
    svg.selectAll(".x-axis").remove();
    svg.selectAll(".y-axis").remove();

    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
  }

  // Add X axis label
  svg
    .append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text("Day of Week");

  // Add Y axis label
  svg
    .append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .text("Number of Sightings");

  // Initial render
  updateChart();
}

function createTimeOfDayChart(data) {
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const width =
    document.getElementById("time-chart").offsetWidth -
    margin.left -
    margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Add filter controls
  const filterContainer = d3
    .select("#time-chart")
    .append("div")
    .attr("class", "filter-controls")
    .style("margin-bottom", "10px");

  // Add shape filter dropdown
  const shapes = [...new Set(data.map((d) => d.UFO_shape))];
  filterContainer
    .append("select")
    .attr("id", "time-shape-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(["All Shapes", ...shapes])
    .enter()
    .append("option")
    .text((d) => d);

  // Add country filter dropdown
  const countryCodes = [...new Set(data.map((d) => d.Country_Code))].filter(
    (code) => code && code.trim() !== ""
  );
  filterContainer
    .append("select")
    .attr("id", "time-country-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(["All Countries", ...countryCodes])
    .enter()
    .append("option")
    .text((d) => d);

  // Create SVG container
  const svg = d3
    .select("#time-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "fixed")
    .style("background-color", "rgba(25, 25, 40, 0.9)")
    .style("color", "#fff")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("border", "1px solid #4CAF50");

  function updateChart() {
    const selectedShape = d3.select("#time-shape-filter").node().value;
    const selectedCountry = d3.select("#time-country-filter").node().value;

    // Filter data
    let filteredData = data;
    if (selectedShape !== "All Shapes") {
      filteredData = filteredData.filter((d) => d.UFO_shape === selectedShape);
    }
    if (selectedCountry !== "All Countries") {
      filteredData = filteredData.filter(
        (d) => d.Country_Code === selectedCountry
      );
    }

    // Count by hour
    const hourCounts = d3.rollup(
      filteredData,
      (v) => v.length,
      (d) => d.hour
    );

    // Convert to array and sort by hour
    const hourData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts.get(i) || 0,
    }));

    // Update scales
    const x = d3
      .scaleBand()
      .range([0, width])
      .domain(hourData.map((d) => d.hour))
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(hourData, (d) => d.count)])
      .range([height, 0]);

    // Update/create bars
    const bars = svg.selectAll(".bar").data(hourData);

    // Remove old bars
    bars.exit().remove();

    // Update existing bars
    bars
      .transition()
      .duration(750)
      .attr("x", (d) => x(d.hour))
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.count));

    // Add new bars
    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", "#4CAF50")
      .attr("x", (d) => x(d.hour))
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.count))
      .attr("opacity", 0.8)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("opacity", 1);

        tooltip.transition().duration(200).style("opacity", 0.9);

        const hourFormatted = d.hour.toString().padStart(2, "0") + ":00";
        tooltip
          .html(`Time: ${hourFormatted}<br>Sightings: ${d.count}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("opacity", 0.8);

        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Update axes
    svg.selectAll(".x-axis").remove();
    svg.selectAll(".y-axis").remove();

    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .tickFormat((d) => d.toString().padStart(2, "0") + ":00")
      );

    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
  }

  // Add X axis label
  svg
    .append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text("Time of Day");

  // Add Y axis label
  svg
    .append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .text("Number of Sightings");

  // Initial render
  updateChart();
}

function createSeasonChart(data) {
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const width =
    document.getElementById("season-chart").offsetWidth -
    margin.left -
    margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Add filter controls
  const filterContainer = d3
    .select("#season-chart")
    .append("div")
    .attr("class", "filter-controls")
    .style("margin-bottom", "10px");

  // Add shape filter dropdown
  const shapes = [...new Set(data.map((d) => d.UFO_shape))];
  filterContainer
    .append("select")
    .attr("id", "season-shape-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(["All Shapes", ...shapes])
    .enter()
    .append("option")
    .text((d) => d);

  // Add country filter dropdown
  const countryCodes = [...new Set(data.map((d) => d.Country_Code))].filter(
    (code) => code && code.trim() !== ""
  );
  filterContainer
    .append("select")
    .attr("id", "season-country-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(["All Countries", ...countryCodes])
    .enter()
    .append("option")
    .text((d) => d);

  // Create SVG container
  const svg = d3
    .select("#season-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "fixed")
    .style("background-color", "rgba(25, 25, 40, 0.9)")
    .style("color", "#fff")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("border", "1px solid #4CAF50");

  function getSeason(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return "Spring";
    if (month >= 5 && month <= 7) return "Summer";
    if (month >= 8 && month <= 10) return "Fall";
    return "Winter";
  }

  function updateChart() {
    const selectedShape = d3.select("#season-shape-filter").node().value;
    const selectedCountry = d3.select("#season-country-filter").node().value;

    // Filter data
    let filteredData = data;
    if (selectedShape !== "All Shapes") {
      filteredData = filteredData.filter((d) => d.UFO_shape === selectedShape);
    }
    if (selectedCountry !== "All Countries") {
      filteredData = filteredData.filter(
        (d) => d.Country_Code === selectedCountry
      );
    }

    // Count by season
    const seasonCounts = d3.rollup(
      filteredData,
      (v) => v.length,
      (d) => getSeason(d.Date_time)
    );

    // Convert to array and sort by season order
    const seasons = ["Winter", "Spring", "Summer", "Fall"];
    const seasonData = seasons.map((season) => ({
      season: season,
      count: seasonCounts.get(season) || 0,
    }));

    // Update scales
    const x = d3.scaleBand().range([0, width]).domain(seasons).padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(seasonData, (d) => d.count)])
      .range([height, 0]);

    // Update/create bars
    const bars = svg.selectAll(".bar").data(seasonData);

    // Remove old bars
    bars.exit().remove();

    // Update existing bars
    bars
      .transition()
      .duration(750)
      .attr("x", (d) => x(d.season))
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.count));

    // Add new bars
    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", "#4CAF50")
      .attr("x", (d) => x(d.season))
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.count))
      .attr("opacity", 0.8)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("opacity", 1);

        tooltip.transition().duration(200).style("opacity", 0.9);

        tooltip
          .html(`Season: ${d.season}<br>Sightings: ${d.count}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("opacity", 0.8);

        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Update axes
    svg.selectAll(".x-axis").remove();
    svg.selectAll(".y-axis").remove();

    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
  }

  // Add X axis label
  svg
    .append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text("Season");

  // Add Y axis label
  svg
    .append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .text("Number of Sightings");

  // Initial render
  updateChart();
}

function createmirandachart(data) {
  const margin = { top: 20, right: 20, bottom: 50, left: 80 };
  const width =
    document.getElementById("miranda-chart").offsetWidth -
    margin.left -
    margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Add filter controls
  const filterContainer = d3
    .select("#miranda-chart")
    .append("div")
    .attr("class", "filter-controls")
    .style("margin-bottom", "10px");

  // Add shape filter dropdown
  const shapes = [...new Set(data.map((d) => d.UFO_shape))];
  filterContainer
    .append("select")
    .attr("id", "miranda-shape-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(["All Shapes", ...shapes])
    .enter()
    .append("option")
    .text((d) => d);

  // Add country filter dropdown
  const countryCodes = [...new Set(data.map((d) => d.Country_Code))].filter(
    (code) => code && code.trim() !== ""
  );
  filterContainer
    .append("select")
    .attr("id", "miranda-country-filter")
    .style("margin-right", "10px")
    .on("change", updateChart)
    .selectAll("option")
    .data(["All Countries", ...countryCodes])
    .enter()
    .append("option")
    .text((d) => d);

  // Create SVG container
  const svg = d3
    .select("#miranda-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  function updateChart() {
    const selectedShape = d3.select("#miranda-shape-filter").node().value;
    const selectedCountry = d3.select("#miranda-country-filter").node().value;

    // Filter data
    let filteredData = data;
    if (selectedShape !== "All Shapes") {
      filteredData = filteredData.filter((d) => d.UFO_shape === selectedShape);
    }
    if (selectedCountry !== "All Countries") {
      filteredData = filteredData.filter(
        (d) => d.Country_Code === selectedCountry
      );
    }

    // Days of the week
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    // Clean and aggregate the filtered data
    const cleanedData = filteredData
      .filter((d) => !isNaN(d.Hour))
      .map((d) => ({
        day: d.day_of_week,
        hour: +d.Hour,
        count: d.count || 1,
      }));

    const counts = d3.rollup(
      cleanedData,
      (v) => v.length,
      (d) => d.day,
      (d) => d.hour
    );

    // Clear existing elements
    svg.selectAll("rect").remove();
    svg.selectAll(".x-axis").remove();
    svg.selectAll(".y-axis").remove();
    svg.selectAll(".x-label").remove();
    svg.selectAll(".y-label").remove();

    // Scales
    const xScale = d3.scaleLinear().domain([0, 24]).range([0, width]);
    const yScale = d3.scaleBand().domain(days).range([0, height]).padding(0.1);
    const colorScale = d3
      .scaleSequential()
      .domain([0, d3.max([...counts.values()].flatMap(d => [...d.values()]))])
      .interpolator(d3.interpolate('#e8f5e9', '#2e7d32'));

    // Draw heatmap
    const xStep = width / 240;
    const yStep = yScale.bandwidth();

    for (const [day, hourMap] of counts.entries()) {
      for (let hour = 0; hour <= 24; hour += 0.1) {
        const lower = Math.floor(hour);
        const upper = Math.ceil(hour);
        const lowerCount = hourMap.get(lower) || 0;
        const upperCount = hourMap.get(upper) || 0;

        const interpolatedCount =
          lower === upper
            ? lowerCount
            : lowerCount + (hour - lower) * (upperCount - lowerCount);

        svg
          .append("rect")
          .attr("x", xScale(hour))
          .attr("y", yScale(day))
          .attr("width", xStep)
          .attr("height", yStep)
          .attr("fill", colorScale(interpolatedCount));
      }
    }

    // Add axes
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(24).tickFormat((d) => `${d}:00`));

    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale));

    // Add labels
    svg
      .append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text("Hour of Day");

    svg
      .append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 10)
      .text("Day of Week");
  }

  // Initial render
  updateChart();
}
// function createShapeChart(data) {
//   // Initial setup
//   const margin = { top: 20, right: 20, bottom: 70, left: 40 };
//   const width =
//     document.getElementById("shape-chart").offsetWidth -
//     margin.left -
//     margin.right;
//   const height = 400 - margin.top - margin.bottom;

//   const svg = d3
//     .select("#shape-chart")
//     .append("svg")
//     .attr("width", width + margin.left + margin.right)
//     .attr("height", height + margin.top + margin.bottom)
//     .append("g")
//     .attr("transform", `translate(${margin.left},${margin.top})`);

//   // Filter controls container
//   const filterContainer = d3
//     .select("#shape-chart")
//     .append("div")
//     .attr("class", "filter-controls")
//     .style("margin-bottom", "10px");

//   // Create country filter dropdown
//   const countries = [...new Set(data.map((d) => d.Country_Code))].filter(
//     (code) => code && code.trim() !== ""
//   );
//   filterContainer
//     .append("select")
//     .attr("id", "country-filter")
//     .style("margin-right", "10px")
//     .on("change", updateChart)
//     .selectAll("option")
//     .data(["All Countries", ...countries])
//     .enter()
//     .append("option")
//     .text((d) => d);

//   // Create season filter dropdown
//   const seasons = ["All Seasons", "Spring", "Summer", "Fall", "Winter"];
//   filterContainer
//     .append("select")
//     .attr("id", "season-filter")
//     .style("margin-right", "10px")
//     .on("change", updateChart)
//     .selectAll("option")
//     .data(seasons)
//     .enter()
//     .append("option")
//     .text((d) => d);

//   // Helper function to determine season
//   function getSeason(date) {
//     const month = date.getMonth();
//     if (month >= 2 && month <= 4) return "Spring";
//     if (month >= 5 && month <= 7) return "Summer";
//     if (month >= 8 && month <= 10) return "Fall";
//     return "Winter";
//   }

//   // Main chart update function
//   function updateChart() {
//     const selectedCountry = d3.select("#country-filter").node().value;
//     const selectedSeason = d3.select("#season-filter").node().value;

//     // Filter data
//     let filteredData = data;

//     if (selectedCountry !== "All Countries") {
//       filteredData = filteredData.filter(
//         (d) => d.Country_Code === selectedCountry
//       );
//     }

//     if (selectedSeason !== "All Seasons") {
//       filteredData = filteredData.filter(
//         (d) => getSeason(d.Date_time) === selectedSeason
//       );
//     }

//     // Count occurrences of each shape
//     const shapeCounts = d3.rollup(
//       filteredData,
//       (v) => v.length,
//       (d) => d.UFO_shape
//     );

//     // Convert to array and sort by count
//     const shapeData = Array.from(shapeCounts, ([shape, count]) => ({
//       shape,
//       count,
//     }))
//       .sort((a, b) => b.count - a.count)
//       .slice(0, 10); // Top 10 shapes

//     // Update scales
//     const x = d3
//       .scaleBand()
//       .range([0, width])
//       .domain(shapeData.map((d) => d.shape))
//       .padding(0.2);

//     const y = d3
//       .scaleLinear()
//       .domain([0, d3.max(shapeData, (d) => d.count)])
//       .range([height, 0]);

//     // Bind data to bars
//     const bars = svg.selectAll("rect").data(shapeData);

//     // Enter new bars
//     bars
//       .enter()
//       .append("rect")
//       .merge(bars) // Merge with existing bars
//       .transition()
//       .duration(750)
//       .attr("x", (d) => x(d.shape))
//       .attr("y", (d) => y(d.count))
//       .attr("width", x.bandwidth())
//       .attr("height", (d) => height - y(d.count))
//       .attr("fill", (d) => "white");

//     // Remove old bars
//     bars.exit().remove();

//     // Update axes
//     svg.selectAll(".x-axis").remove();
//     svg.selectAll(".y-axis").remove();

//     svg
//       .append("g")
//       .attr("transform", `translate(0,${height})`)
//       .attr("class", "x-axis")
//       .call(d3.axisBottom(x))
//       .selectAll("text")
//       .attr("transform", "rotate(-45)")
//       .style("text-anchor", "end");

//     svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
//   }

//   // Initial render
//   updateChart();
// }

