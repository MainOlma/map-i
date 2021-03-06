import * as d3 from "d3"
import olma from './olma.json'
import data from './data.csv'
import alias from './region.csv'
import * as topojson from "topojson"
//import legend from 'd3-svg-legend'
import {legend} from "./d3/color-legend"



let centered
const locale = d3.formatLocale({decimal: ","})
const commaFormat = locale.format(',.2f')
const commaLegendFormat = locale.format(',.1f')

const div = d3.select("#chart").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

const div_value = div.append('h3')
const div_name = div.append('p')

const color = d3.scaleSequential(d3.interpolateGreens)
    .domain([0, 1]);

const drawLegend = title =>{
    d3.select('g.map').append("g")
        .attr("transform", "translate(115,480)")
        .append(() => legend({color, title: title, width:280 , tickFormat: commaLegendFormat,ticks: 6, tickSize:0}));
}

const drawMap = () => {
    const margin = {top: 0, right: 0, bottom: 0, left: 0};
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", '100vw')
        .attr("height", '100vh')
        .attr("viewBox",'0 0 ' + width + ' '+height)
        .append('g')
        .attr('class', 'map');

    const projection = d3.geoAlbers()
        .rotate([-105, 0])
        .center([-10, 65])
        .parallels([52, 64])
        .scale(800)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    svg.append("g")
        .attr("class", "countries")
        .selectAll("path")
        .data(topojson.feature(olma, olma.objects.russia).features, d=>d.properties)
        .join("path")
        .attr("id",d => d.properties.iso_3166_2)
        .attr("d", path)
        .attr("class","country enter")

    d3.select('.countries').selectAll("path").on("click", clicked);
    function clicked(d) {
        var x, y, k;

        if (d && centered !== d) {
            var centroid = path.centroid(d.feature);
            x = centroid[0];
            y = centroid[1];
            k = 2;
            centered = d;
        } else {
            x = width / 2;
            y = height / 2;
            k = 1;
            centered = null;
        }

        svg.selectAll("path")
            .classed("active", centered && function(d) { return d === centered; });

        svg.transition()
            .duration(750)
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");
    }

    return svg.node();
}

const updateData = upddata => {
    let data = d3.csvParse(upddata)
    const columns = data.columns

    d3.csv(alias).then(alias => {
        let newdata = data.map((el,i) => {
            let iso = alias.find(region =>
                (region['regAliasTheConstitutionalName'].toLowerCase() == el[columns[0]].toLowerCase()
                    || region['regAliasDatawrapper'].toLowerCase() == el[columns[0]].toLowerCase()
                    || region['regAliasDuckConsulting'].toLowerCase() == el[columns[0]].toLowerCase()
                    || region['regKmpny'].toLowerCase() == el[columns[0]].toLowerCase()
                )
            )

            if (!iso) iso = {}
            return {
                id:i,
                iso: iso.regAliasISOCode,
                value: el[columns[1]],
                name: el[columns[0]]
            }
        })
        const max = d3.max(newdata.map(s=>s.value))
        color.domain([0,max])
        drawLegend(data.columns[1])
        updateMap(newdata)
    })
}

const updateMap = data => {
    const t = d3.transition()
        .duration(750);

    const paths = d3.select('.countries').selectAll("path")
        .data(topojson.feature(olma, olma.objects.russia).features
            .map((d, i) => {
                let tmp = data.find(e => e.iso == d.properties.iso_3166_2)
                if (!tmp) tmp = {}
                return {
                    id: i,
                    name: tmp.name,
                    value: tmp.value,
                    iso: d.properties.iso_3166_2,
                    feature: d
                }
            }))

    paths.exit()
        .attr("class", "exit country")
        .transition(t)
        .remove();

    paths.attr("class", "update country")
        .transition(t)
        .style("fill", (d) => color(d.value))

    d3.select('.countries').selectAll("path")
        .on("mouseover", function (d) {
            this.parentNode.appendChild(this);
            d3.select(this).classed("hovered", true);
            div.transition().duration(300)
                .style("opacity", 1)
            div_value.text(commaFormat(d.value))
            div_name.text(d.name)
        })
        .on("mouseout", function () {
            d3.select(this).classed("hovered", false)
            div.transition().duration(300)
                .style("opacity", 0);
        })
        .on("mousemove", () => {
            div.style("left", (d3.event.x) + 10 + "px")
                .style("top", (d3.event.y) + 15 + "px");
        })

}

const drawTable = data => {
    let tbl = "<table class=' ui celled table unstackable striped '><tbody>"
    const lines = data.split("\n");
    for (let i = 0; i < lines.length; i++) {
        tbl = tbl + "<tr>"
        let items = lines[i].split(",");
        for (let j = 0; j < items.length; j++) {
            tbl = tbl + "<td>" + items[j] + "</td>";
        }
        tbl = tbl + "</tr>";
    }
    tbl = tbl + "</tbody></table>";
    let divTable = document.getElementById('table');
    //console.log(tbl);
    divTable.innerHTML = tbl;
}


d3.text(data).then( data => {
    drawMap()
    drawTable(data)
    updateData(data)

});

