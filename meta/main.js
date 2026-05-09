import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;
let commits = [];


async function loadData() {
    const data = await d3.csv("loc.csv", d => {
        return {
            ...d,
            datetime: new Date(d.datetime) 
        };
    });

    console.log(data);
    return data;
}

function processCommits(data) {
    return d3
    .groups( data, (d) => d.commit)
    .map(([commit, lines]) => {
        let first = lines[0];
        let {author, date, time, timezone, datetime} = first;
        let ret = {
            id: commit,
            url: "https://github.com/portfolio/commit/" + commit,
            author, 
            date, 
            time, 
            timezone, 
            datetime, 
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60, 
            totalLines: lines.length
            
        };

        Object.defineProperty(ret, "lines", {
            value: lines, 
            enumerable: false,
            writable: false,
            configurable: false
        });
        return ret;

    });


}

function renderCommitInfo(data, commits){
    const dl = d3
        .select("#stats")
        .append('dl')
        .attr('class', 'stats');
    //total lines of code 
    dl.append('dt').text("Total <abbr title='Lines of Code'>LOC</abbr>");
    dl.append('dd').text(data.length);
    dl.append('dt').text('Total Commits');
    dl.append('dd').text(commits.length);
    //num files 
    const files = new Set(data.map((d) => d.file));
    dl.append('dt').text('Number of files');
    dl.append('dd').text(files.size);
    const fileCounts = d3.rollup(
        data,
        (v) => v.length,
        (d) => d.file
    );
    const longestFile = d3.greatest(
        fileCounts, 
        d => d[1]

    );
    dl.append('dt').text('Longest file');
    dl.append("dd").text(`${longestFile[0]} (${longestFile[1]} lines)`);

    const avgFileLength = d3.mean(fileCounts, d => d[1]);
    dl.append('dt').text('Average file length');
    dl.append('dd').text(avgFileLength.toFixed(1));
    
    const avgLineLength = d3.mean(data, d => data.length);
    dl.append('dt').text('Average line length');
    dl.append('dd').text(avgLineLength.toFixed(1) + ' characters');

    //most active time of the day, (morn, afternoon, night, evening)
    const periods = commits.map(commit => {
        const hour = commit.datetime.getHours();
        if (hour < 6) return 'Night';
        if (hour < 12) return 'Morning';
        if (hour < 18) return 'Afternoon';
        return 'Evening';
    });
    const periodCounts = d3.rollups(
        periods,
        v => v.length,
        d => d
    );
    const busiestPeriod = d3.greatest(periodCounts, d => d[1]);
    dl.append('dt') .text('Most active time');
    dl.append('dd').text(busiestPeriod[0]);

}

function renderToolTipContent(commit){
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const linesEdited = document.getElementById('commit-lines');

    if (Object.keys(commit).length === 0) return;
    
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocalString('en', {
        dateStyle: 'full',
    });
    
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById("commit-tooltip");
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById("commit-tooltip");
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}



function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;

}

function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle')
        .classed('selected', d => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

function renderSelectionCount(selection) {
    const selected = selection ? commits.filter(d => isCommitSelected(selection, d)) : [];
    document.quarySelector('#selection-count')
        .textContent = selected.length
        ? `${selected.length} commits selected`
        : "No commits selected"; 
}


function renderScatterPlot(data, commits){
    // all the js code of steps here 
    const width = 1000;
    const height = 600;
    const svg = d3
        .select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    xScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width]);


    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);


    const margin = {top: 10, right: 10, bottom: 30, left: 20};

    const usableArea = {
        top: margin.top, 
        right: width - margin.right, 
        bottom: height - margin.bottom, 
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };


    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    const gridlines = svg  
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const dots = svg.append('g').attr('class', 'dots');


    dots
        .selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', 5)
        .attr('fill', 'steelblue')
        .on('mouseenter', (event, commit) => {
            renderToolTipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
            updateTooltipVisibility(false);

        })

    createBrushSelector(svg);


    


}

function createBrushSelector(svg){
    svg.call(d3.brush().on('start brush end', brushed));
    svg.selectAll('.dots, .overlay ~ *').raise();


}

function renderLanguageBreakdown(selection){
    const selectedCommits = selection 
        ? commits.filter(d => isCommitSelected(selection, d))
        : [];
        
    const container = document.getElementById('language-breakdown');
    if (!container) return;
    const relevant = selectedCommits.length ? selectedCommits : commits;
    const lines = relevant.flatMap(d => d.lines);
    const breakdown = d3/rollup(
        lines, 
        v => v.length,
        d => d.type
    );

    container.innerHTML = '';
    for (const [lang, count] of breakdown){
        const pct = d3.format('.1~%')(count / lines.length);
        container.innerHTML += `
            <dt>${lang}</dt>
            <dd>${count} lines (${pct})</dd>
        `;

    }
}




let data = await loadData();
commits = await processCommits(data);
console.log(commits.length);
console.log(commits[0].datetime);
renderCommitInfo(data, commits);
renderScatterPlot();




