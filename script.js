// Load and process the data
d3.csv('data/ufo-sightings-transformed.csv').then(data => {
    // Parse dates and numeric values
    data.forEach(d => {
        d.Date_time = new Date(d.Date_time);
        d.latitude = +d.latitude;
        d.longitude = +d.longitude;
        d.length_of_encounter_seconds = +d.length_of_encounter_seconds;
    });

    createTimelineChart(data);
    createMap(data);
    createShapeChart(data);
});

function createTimelineChart(data) {
    // Group data by year
    const yearCounts = d3.rollup(
        data,
        v => v.length,
        d => d.Date_time.getFullYear()
    );

    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    const width = document.getElementById('timeline-chart').offsetWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select('#timeline-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent([...yearCounts.keys()]))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max([...yearCounts.values()])])
        .range([height, 0]);

    // Let's first check what data we have
    console.log("Sample data point:", data[0]); // This will help us see the correct property name

    // Add filter controls
    const filterContainer = d3.select('#timeline-chart')
        .append('div')
        .attr('class', 'filter-controls')
        .style('margin-bottom', '10px');

    // Add shape filter dropdown
    const shapes = [...new Set(data.map(d => d.UFO_shape))];
    filterContainer.append('select')
        .attr('id', 'shape-filter')
        .style('margin-right', '10px')
        .on('change', updateChart)
        .selectAll('option')
        .data(['All Shapes', ...shapes])
        .enter()
        .append('option')
        .text(d => d);

    // Updated country filter dropdown using Country_Code
    const countryCodes = [...new Set(data.map(d => d.Country_Code))]
        .filter(code => code && code.trim() !== '');
    
    // Create a mapping for country codes to full names
    const countryNames = {
        // 'USA': 'United States',
        // 'CAN': 'Canada',
        // 'GBR': 'United Kingdom',
        // 'AUS': 'Australia',
        // Add more as needed
    };

    filterContainer.append('select')
        .attr('id', 'country-filter')
        .style('margin-right', '10px')
        .on('change', updateChart)
        .selectAll('option')
        .data(['All Countries', ...countryCodes])
        .enter()
        .append('option')
        .text(d => d === 'All Countries' ? d : `${countryNames[d] || d}`);

    // Add season filter dropdown
    const seasons = ['All Seasons', 'Spring', 'Summer', 'Fall', 'Winter'];
    filterContainer.append('select')
        .attr('id', 'season-filter')
        .style('margin-right', '10px')
        .on('change', updateChart)
        .selectAll('option')
        .data(seasons)
        .enter()
        .append('option')
        .text(d => d);

    // Helper function to determine season
    function getSeason(date) {
        const month = date.getMonth();
        if (month >= 2 && month <= 4) return 'Spring';
        if (month >= 5 && month <= 7) return 'Summer';
        if (month >= 8 && month <= 10) return 'Fall';
        return 'Winter';
    }

    // Function to filter and aggregate data
    function getFilteredData() {
        const selectedShape = d3.select('#shape-filter').node().value;
        const selectedCountry = d3.select('#country-filter').node().value;
        const selectedSeason = d3.select('#season-filter').node().value;

        let filteredData = data;

        if (selectedShape !== 'All Shapes') {
            filteredData = filteredData.filter(d => d.UFO_shape === selectedShape);
        }
        
        if (selectedCountry !== 'All Countries') {
            filteredData = filteredData.filter(d => d.Country_Code === selectedCountry);
        }

        if (selectedSeason !== 'All Seasons') {
            filteredData = filteredData.filter(d => d.Season === selectedSeason); // Using the Season field from data
        }

        return d3.rollup(
            filteredData,
            v => v.length,
            d => d.Date_time.getFullYear()
        );
    }

    // Create tooltip
    const tooltip = d3.select('#timeline-chart')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('border', '1px solid #ddd')
        .style('padding', '10px')
        .style('pointer-events', 'none');

    function updateChart() {
        const yearCounts = getFilteredData();
        
        // Update scales
        x.domain(d3.extent([...yearCounts.keys()]));
        y.domain([0, d3.max([...yearCounts.values()])]);

        // Update dots
        const dots = svg.selectAll('.dot')
            .data([...yearCounts]);

        dots.exit().remove();

        // Update existing dots
        dots.transition()
            .duration(750)
            .attr('cx', d => x(d[0]))
            .attr('cy', d => y(d[1]));

        // Add new dots
        dots.enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('r', 4)
            .attr('fill', '#2c3e50')
            .attr('cx', d => x(d[0]))
            .attr('cy', d => y(d[1]))
            .on('mouseover', (event, d) => {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                tooltip.html(`Year: ${d[0]}<br/>Sightings: ${d[1]}`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        // Update axes
        svg.select('.x-axis')
            .transition()
            .duration(750)
            .call(d3.axisBottom(x).tickFormat(d3.format('d')));

        svg.select('.y-axis')
            .transition()
            .duration(750)
            .call(d3.axisLeft(y));
    }

    // Remove the line path code and only keep the axes setup
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`);

    svg.append('g')
        .attr('class', 'y-axis');

    // Initial chart render
    updateChart();
}

function createMap(data) {
    // Filter out any invalid coordinates
    const validData = data.filter(d => {
        const isValid = !isNaN(d.latitude) && !isNaN(d.longitude) &&
                       d.latitude !== null && d.longitude !== null &&
                       Math.abs(d.latitude) <= 90 && Math.abs(d.longitude) <= 180;
        if (!isValid) {
            console.log("Invalid data point:", d);
        }
        return isValid;
    });

    console.log("Valid data points:", validData.length);

    // Initialize the map
    const map = L.map('map').setView([39.8283, -98.5795], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add markers with clustering
    const markers = L.markerClusterGroup();
    
    validData.forEach(d => {
        try {
            const marker = L.marker([d.latitude, d.longitude])
                .bindPopup(`
                    <strong>Date:</strong> ${d.Date_time.toLocaleDateString()}<br>
                    <strong>Shape:</strong> ${d.UFO_shape}<br>
                    <strong>Duration:</strong> ${d.Encounter_Duration}<br>
                    <strong>Description:</strong> ${d.Description.substring(0, 100)}...
                `);
            markers.addLayer(marker);
        } catch (e) {
            console.error("Error creating marker:", e, d);
        }
    });

    // Add markers to the map
    map.addLayer(markers);
}

function createShapeChart(data) {
    // Count occurrences of each shape
    const shapeCounts = d3.rollup(
        data,
        v => v.length,
        d => d.UFO_shape
    );

    // Convert to array and sort by count
    const shapeData = Array.from(shapeCounts, ([shape, count]) => ({shape, count}))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 shapes

    const margin = {top: 20, right: 20, bottom: 70, left: 40};
    const width = document.getElementById('shape-chart').offsetWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select('#shape-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(shapeData.map(d => d.shape))
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(shapeData, d => d.count)])
        .range([height, 0]);

    // Add bars
    svg.selectAll('rect')
        .data(shapeData)
        .enter()
        .append('rect')
        .attr('x', d => x(d.shape))
        .attr('y', d => y(d.count))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.count))
        .attr('fill', '#3498db');

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

    svg.append('g')
        .call(d3.axisLeft(y));
}