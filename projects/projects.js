import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js';

console.log("projects.js loaded");

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');


if (projectsTitle) {
  projectsTitle.textContent = `${projects.length} Projects`;
}



let query ="";

let selectedYear = null;

renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);


function applyFilters() {
  let filteredProjects = projects.filter((projects) => {
    let values = Object.values(projects).join("\n").toLowerCase();
    let matchesSearch = values.includes(query.toLowerCase());
    let matchesYear = selectedYear === null || project.year == selectedYear;
    return matchesSearch && matchesYear;
  });

  renderProjects(filteredProjects, projectsContainer, "h2");
  renderPieChart(filteredProjects);
}




function renderPieChart(projectsGiven) {
  const svg = d3.select("#projects-plot");
  const legend = d3.select(".legend");

  svg.selectAll("path").remove();
  legend.selectAll("li").remove();

  let rolledData = d3.rollups(
    projectGiven, 
    (v) => v.length,
    (d) => d.year
  );

  let data = rolledData.map(([year, count]) => {
    return {value: count, label: year};
  });

  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));

  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  arcs.forEach((arc, i) => {
    svg
      .append("path")
      .attr("d", arc)
      .attr("fill", colors(i))
      .attr("class", data[i].label === selectedYear ? "selected" : "")
      .on("click", () => {
        selectedYear = data[i].label === selectedYear ? null : data[i].label;
        applyFilters();
      });
  });

  data.forEach((d, idx) => {
    legend.append("li")
    .attr("style", `--color:${colors(idx)}`)
    .attr("class", d.label == selectedYear ? "legend-item selected" : "legend-item")
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);

  });


}

searchInput.addEventListener("input", (event) => {
  query = event.target.value.toLowerCase();
  applyFilters();

});





