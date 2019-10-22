import * as d3 from "d3";
import map from './rus.json'
//import olma from './olma.json'
import data from './data.csv'
import alias from './region.csv'
import * as topojson from "topojson"

const textArea = document.getElementById('data');
textArea.addEventListener('input', () => {
    drawTable()
    updateData(textArea.value)
})

let centered;

const div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

const color = d3.scaleSequential(d3.interpolateGreens)
    .domain([0, 0.6]);

const drawMap = () => {
    const margin = {top: 0, right: 0, bottom: 0, left: 0};
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append('g')
        .attr('class', 'map');

    const projection = d3.geoAlbers()
        .rotate([-105, 0])
        .center([-10, 65])
        .parallels([52, 64])
        .scale(800)
        .translate([width / 2, height / 2]);
    //const projection = d3.geoMercator();

    const path = d3.geoPath().projection(projection);

    //var projection = d3.geoMercator().scale(100);


    svg.append("g")
        .attr("class", "countries")
        .selectAll("path")
        .data(topojson.feature(map, map.objects.russia).features)
        //.data(geo.features)
        .join("path")
        .attr("d", path)
        .attr("id",d => d.properties.iso_3166_2)
        .attr("class","country enter")
        .style("stroke-opacity", 0.4)
        .style("stroke", "white");

    d3.selectAll("path")
        .on("mouseover", function(d) {
            d3.select(this).transition().duration(300).style("stroke-opacity", 1) ;
            div.transition().duration(300)
                .style("opacity", 1)
            div.text(d.name + ' ' +d.value)
                .style("left", (d3.event.x) + "px")
                .style("top", (d3.event.y) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition().duration(300)
                .style("stroke-opacity", 0.4);
            div.transition().duration(300)
                .style("opacity", 0);
        })
        .on("click", clicked);

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


const initData = data =>{
    d3.text(data).then( data => {
        textArea.value=data
        drawTable()
        updateData(textArea.value)
    })
}



const updateData = upddata => {
    let data = d3.csvParse(upddata)
    const columns = data.columns

    d3.csv(alias).then(alias => {
        let newdata = data.map(el => {
            let iso = alias.find(region =>
                (region['regAliasTheConstitutionalName'].toLowerCase() == el[columns[0]].toLowerCase()
                    || region['regAliasDatawrapper'].toLowerCase() == el[columns[0]].toLowerCase()
                    || region['regAliasDuckConsulting'].toLowerCase() == el[columns[0]].toLowerCase()
                    || region['regKmpny'].toLowerCase() == el[columns[0]].toLowerCase()
                )
            )

            if (!iso) iso = {}
            return {
                iso: iso.regAliasISOCode,
                value: el[columns[1]],
                name: el[columns[0]]
            }
        })
        console.log("NEW DATA: ", newdata)
        updateMap(newdata)
    })

}

const updateMap = data => {
    const t = d3.transition()
        .duration(750);

    const paths = d3.selectAll("path")
        .data(topojson.feature(map, map.objects.russia).features
            .map(d => {
                let tmp = data.find(e => e.iso == d.properties.iso_3166_2)
                if (!tmp) tmp={}
                return {
                    name:tmp.name,
                    value: tmp.value,
                    iso:d.properties.iso_3166_2,
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
}


const drawTable = () => {
    let tbl = "<table class=' ui celled table unstackable striped '><tbody>"
    const lines = document.getElementById("data").value.split("\n");
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



drawMap()
initData(data)