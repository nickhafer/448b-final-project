// Load and process the data
d3.csv("data/ufo-sightings-transformed.csv").then((data) => {
  // Parse dates and numeric values
  data.forEach((d) => {
    d.Date_time = new Date(d.Date_time);
    d.latitude = +d.latitude;
    d.longitude = +d.longitude;
    d.length_of_encounter_seconds = +d.length_of_encounter_seconds;
    d.hour = +d.hour;
  });

  createTimelineChart(data);
  createMap(data);
  createHeatmap(data);
  //createShapeChart(data);
});

function createTimelineChart(data) {
  // Group data by year
  const yearCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => d.Date_time.getFullYear()
  );

  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
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
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 325 + "px");
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
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const width =
    document.getElementById("day-chart").offsetWidth -
    margin.left -
    margin.right;
  const height = 400 - margin.top - margin.bottom;
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const hours = d3.range(0, 24);

  // Scales
  const xScale = d3.scaleBand().domain(hours).range([0, width]).padding(0.05);
  const yScale = d3.scaleBand().domain(days).range([0, height]).padding(0.05);
  const colorScale = d3
    .scaleSequential(d3.interpolateViridis)
    .domain([0, d3.max(data, (d) => d.count)]);

  // Create SVG container
  const svg = d3
    .select("#day-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Draw heatmap
  svg
    .selectAll(".tile")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => xScale(d.hour))
    .attr("y", (d) => yScale(d.day))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", (d) => colorScale(d.count))
    .on("mouseover", (event, d) => {
      d3.select(".tooltip")
        .style("display", "block")
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 30 + "px")
        .html(`Day: ${d.day}<br>Hour: ${d.hour}<br>Count: ${d.count}`);
    })
    .on("mouseout", () => {
      d3.select(".tooltip").style("display", "none");
    });

  // Add axes
  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat((d) => `${d}:00`));

  svg.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale));

  // Add labels
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .text("Hour of Day");

  svg
    .append("text")
    .attr("x", -margin.left / 2)
    .attr("y", -margin.top / 2 + 10)
    .attr("text-anchor", "start")
    .text("Day of the Week");
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
