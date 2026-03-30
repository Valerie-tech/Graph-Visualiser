/* ===========================================================
   GRAPH DATA
   -----------------------------------------------------------
   Nodes: fixed positions from user's specification
   Edges: stored as "A-B": weight
   =========================================================== */

const nodes = {
    "A": [120, 70],
    "B": [360, 60],
    "C": [390, 240],
    "D": [90, 220],
    "E": [470, 140],
    "F": [210, 320]
};

const edges = {
    "A-B": 5,
    "A-C": 5,
    "A-D": 2,
    "B-D": 2,
    "B-E": 6,
    "C-E": 1,
    "D-E": 7,
    "D-F": 1,
    "C-F": 4
};

let showFinalTree = false;

/* ===========================================================
   CANVAS INITIALISATION
   =========================================================== */

const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");

// Visited node and accepted edge 
let permanentlyVisited = new Set();   // stays yellow
let permanentlyHighlightedEdges = new Set();  // stays coloured

// Auto-scale when panel resizes
new ResizeObserver(() => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    drawGraph();
}).observe(canvas);


/* ===========================================================
   DRAW GRAPH
   -----------------------------------------------------------
   highlightNode: node currently being visited
   highlightEdge: edge currently being examined
   edgeColour:     colour for edge highlight
   =========================================================== */
   function drawGraph(highlightNode = null, highlightEdge = null, edgeColour = "yellow") {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* --------- Draw edges ---------- */
    for (let e in edges) {
        let [a, b] = e.split("-");
        let [x1, y1] = nodes[a];
        let [x2, y2] = nodes[b];

        x1 -= 35;
        y1 += 15;
        x2 -= 35;
        y2 += 15;

        let colour = "black";
        let width = 2;

        // highlightEdge must override permanent edge
        if (highlightEdge === e) {
            colour = edgeColour;
            width = 4;
        } else if (permanentlyHighlightedEdges.has(e)) {
            colour = "red";
            width = 4;
        }

        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.fillStyle = "blue";
        ctx.font = "bold 14px Arial";
        if (e === "A-C" || e === "C-A") {
             x1-= 125;
             y1-=70;
        }

        if (e === "E-C" || e === "C-E") {
             x1-= 20;
             y1-=0;
        }

        ctx.fillText(edges[e], (x1 + x2) / 2 + 5, (y1 + y2) / 2 - 9);

    }

    /* --------- Draw nodes ---------- */
    for (let n in nodes) {
        let [x, y] = nodes[n];

        x -= 35;
        y += 15;
      

        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);

        // highlightNode must override permanent
        if (highlightNode === n) {
            ctx.fillStyle = "yellow";
        } else if (permanentlyVisited.has(n)) {
            ctx.fillStyle = "#90D5FF";
        } else {
            ctx.fillStyle = "white";
        }

        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();
        

        ctx.fillStyle = "black";
        ctx.fillText(n, x - 5, y + 5);
    }
}



/* ===========================================================
   PANELS
   =========================================================== */

function logExplain(msg) {
    document.getElementById("explain").innerHTML += msg + "<br>";
}

function logExplainBlank(msg) {
    document.getElementById("explain").innerHTML += msg + "<br><br>";
}

function logStep(msg) {
    document.getElementById("steps").innerHTML += msg + "<br>";
}

/* ===========================================================
   CLEAR PANELS
   =========================================================== */
function clearPanels() {

    document.getElementById("explain").innerHTML = "";
    document.getElementById("steps").innerHTML = "";
    document.getElementById("fwMatrices").innerHTML = "";
    document.getElementById("fwMatricesTitle").style.display = "none";

    document.getElementById("explain").scrollTop = 0;

    document.getElementById("fwStartButtons").style.display = "none";
    document.getElementById("fwStartButtons").innerHTML = "";

    document.getElementById("primStartButtons").style.display = "none";
    document.getElementById("primStartButtons").innerHTML = "";
    
}


/* ===========================================================
   ANIMATION ENGINE (Play / Step)
   =========================================================== */

let activeSteps = [];
let stepIndex = 0;
let playInterval = null;

function doStep() {
   
    if (stepIndex >= activeSteps.length) return;

    const st = activeSteps[stepIndex];

    logStep("Step " + (stepIndex + 1));

    if (st.explain) {
        logExplain(st.explain);
    }

    if (st.node) {
        permanentlyVisited.add(st.node);
    }

    if (st.acceptEdge) {
        permanentlyHighlightedEdges.add(st.acceptEdge);
    }

    drawGraph(st.node, st.edge);

    stepIndex++;

}


function playSteps() {
    if (!activeSteps.length) return;
    playInterval = setInterval(() => {
        if (stepIndex >= activeSteps.length) {
            clearInterval(playInterval);
            if (showFinalTree) {
               drawFinalTree(); 
            }
        }
        doStep();
    }, 1000);
}


/* ===========================================================
   RESET MEMORY WHEN STARTING NEW ALGORITHM
   =========================================================== */
function resetGraphMemory() {
    permanentlyVisited.clear();
    permanentlyHighlightedEdges.clear();
    drawGraph();
}


// To ensure calculations work in both directions - e.g. A-C AND C-A
function norm(u, v) {
    return u < v ? `${u}-${v}` : `${v}-${u}`;
}

let finalPrev = {};   // store final parent tree
function runDijkstra(startNode) {
    const start = startNode;
    showFinalTree = true;

    clearPanels();
    resetGraphMemory();
    enableAnimation();

    activeSteps = [];
    stepIndex = 0;

    document.getElementById("steps").innerHTML = "";  

    logExplain("<b>Dijkstra Algorithm (from A)</b>");
    logExplain("<br>Uses the weights of the edges to find the path that minimises the total distance (weight) between the source node and all other nodes<br>")


    const adjacency = {};
    for (const key in edges) {
        const [u, v] = key.split("-");
        const w = edges[key];

        if (!adjacency[u]) adjacency[u] = [];
        if (!adjacency[v]) adjacency[v] = [];

        adjacency[u].push({ node: v, weight: w });
        adjacency[v].push({ node: u, weight: w });
    }

    const dist = {};
    const prev = {};
    const visited = new Set();

    for (const n in nodes) {
        dist[n] = Infinity;
        prev[n] = null;
    }
    dist[start] = 0;

    function extractMin() {
        let best = null;
        let bestDist = Infinity;
        for (const n in dist) {
            if (!visited.has(n) && dist[n] < bestDist) {
                best = n;
                bestDist = dist[n];
            }
        }
        return best;
    }

    // MAIN LOOP
    while (true) {
        const current = extractMin();
        if (!current) break;

        visited.add(current);

        activeSteps.push({
            node: current,
            edge: null,
            explain: `Visiting ${current} — closest unvisited node (distance = ${dist[current]}).`
        });

        for (const adj of adjacency[current]) {
            const nbr = adj.node;
            const w = adj.weight;

            if (visited.has(nbr)) continue;

            const newDist = dist[current] + w;

            if (newDist < dist[nbr]) {

                const edge = norm(current, nbr);

                const explanation =
                    `Considering edge ${edge} (weight ${w}).<br>
                     New distance = ${newDist} < old = ${dist[nbr]}.<br>
                     Selecting this edge.`;

                activeSteps.push({
                    node: nbr,
                    edge,
                    explain: explanation
                });

                dist[nbr] = newDist;
                prev[nbr] = current;
            }
        }
    }

    
    finalPrev = { ...prev };

    
    activeSteps.push({
        explain: "<h3>FINAL TREE</h3>"
    });



    // FINAL TREE EDGES
    for (const node in prev) {
          const parent = prev[node];

          if (!parent) continue;

              const edge = norm(parent, node);

              activeSteps.push({
                 node: node,
                 edge: edge,
                 acceptEdge: edge,
                 explain: `Final tree edge: ${edge} (weight ${edges[edge]})`
              });
    }
 
    drawGraph();
    return { dist, prev };
}


function drawFinalTree() {

    permanentlyHighlightedEdges.clear();
    permanentlyVisited.clear();

    let totalWeight = 0;

    // rebuild final edges from finalPrev
    for (const node in finalPrev) {
        const parent = finalPrev[node];
        if (!parent) continue;

        const edge = norm(parent, node);

        permanentlyHighlightedEdges.add(edge);
        permanentlyVisited.add(node);
        permanentlyVisited.add(parent);

        totalWeight += edges[edge];
    }

    drawGraph(); // redraw with only final tree highlights

    logExplain(`<b>Final Tree Weight = ${totalWeight}</b><br>`);

    logExplain(`<b>Why is this higher than Kruskal or Prim?</b><br>`);
    logExplain(`Because Dijkstra <b>has to follow a path</b>, whereas Kruksal and Prim select <b>the cheapest - anywhere</b>. e.g.`);
    logExplain(`C-E, Kruksal and Prim select C-E directly = 1, however, Dijkstra (from A) has to follow the path i.e. A-C-E = 6  <br>`);
}


/* ===========================================================
   KRUSKAL’S MINIMUM SPANNING TREE
   =========================================================== */
function runKruskal() {
    showFinalTree = false;

    clearPanels();
    resetGraphMemory();

    activeSteps = [];
    stepIndex = 0;

    totalWeight = 0
   

    logExplain("<b>Kruskal's Algorithm</b><br>");
    logExplain(`<br> <b>1. </b>
                Sort the edges in terms of increasing weight<br>

            <b>2. </b>  
                Select the edge of least weight<br>
                 If there is more than one edge of the same weight, either may be used<br>

            <b>3. </b>
                Select the next edge of least weight that has not already been chosen.  

                Reject it if it forms a cycle with the other selected edges

                Otherwise, add it to your tree<br>

            <b>4. </b>

                Repeat 3. above until all of the vertices in the graph are connected

                If there are n nodes then there will be n - 1 edges in the minimum spanning tree<br>

            <b>5. </b>
                List the edges in the minimum spanning tree in the order they were added <br><br>`);


    // ----------------------------------------------------------
    // SORT THE EDGES — Used for BOTH display and algorithm
    // ----------------------------------------------------------
    const sorted = Object.keys(edges)
        .map(e => ({ edge: e, w: edges[e] }))
        .sort((a, b) => a.w - b.w);   // ascending numeric sort

    // ----------------------------------------------------------
    // STEP 1 — Display sorted edges in middle panel
    // ----------------------------------------------------------
    let sortedListHTML = "";
    sorted.forEach(item => {
        sortedListHTML += `${item.edge} (weight ${item.w})<br>`;
    });

    logExplain("<b>Sorted edges (ascending by weight):</b><br>" + sortedListHTML + "<br>");
    

    // ----------------------------------------------------------
    // KRUSKAL MST CONSTRUCTION
    // ----------------------------------------------------------
    const parent = {};
    Object.keys(nodes).forEach(n => parent[n] = n);

    const find = x => parent[x] === x ? x : parent[x] = find(parent[x]);
    const union = (a, b) => parent[find(a)] = find(b);


    // For each edge in sorted order
    for (let { edge, w } of sorted) {

        let [a, b] = edge.split("-");

        if (find(a) !== find(b)) {
            // Accept this edge into MST
            union(a, b);

            activeSteps.push({
                edge,
                acceptEdge: edge,
                highlightNodes: [a, b],    // highlight both nodes
                explain: `Adding edge ${edge} (weight ${w}) to MST.`
            });

            totalWeight += w;

        } else {

            activeSteps.push({
                explain: `Skipping ${edge} (would form a cycle).`
            });
        }
    }

    activeSteps.push({
       explain: `<br><b>Total weight = ${totalWeight}</b>`
    });

    // Enable animation
    enableAnimation();
    drawGraph();
}



/* ===========================================================
   PRIM’S MST — USER CHOOSES START NODE
   =========================================================== */

function runPrim() {
    showFinalTree = false;

    clearPanels();
    resetGraphMemory();

    activeSteps = [];
    stepIndex = 0;

    logExplain("<b>Prim's Algorithm</b>:");
    logExplain(`Prim determines the minimum total cost of the network, (not the shortest path) by:`)
    logExplain(`<b>choosing a starting node</b>, then attaching <b>a new edge</b> to a single, growing, tree at each step:<br>
                Start with any node/vertex as a single-vertex tree <br>
                <b>Add V-1 edges</b> (V=number of nodes, in this case 6) to it, by taking the <b>next minimum-weighted edge</b> that <b>connects a vertex on the tree to a vertex not yet in the tree</b>
                Therefore, when the tree has V-1 edges, it is complete, in this case 5\n\n`);


    // Show start node buttons
    const area = document.getElementById("primStartButtons");
    area.style.display = "block";

    for (let n in nodes) {
        const btn = document.createElement("button");
        btn.textContent = "Start at " + n;
        btn.classList.add("primBtn");
        btn.onclick = () => primFrom(n);
        area.appendChild(btn);
    }
}


/* Run Prim once user chooses start */
function primFrom(startNode) {

    clearPanels();
    resetGraphMemory();

    logExplainBlank(`<b>Prim's Algorithm started at ${startNode}</b>`);

    activeSteps = [];
    stepIndex = 0;

    const visited = new Set();
    visited.add(startNode);
    totalWeight = 0;

    // Step 1
    activeSteps.push({
        node: startNode,
        explain: `Starting at ${startNode}. Mark it visited.`
    });

    const allEdges = Object.keys(edges);

    while (visited.size < Object.keys(nodes).length) {

        let bestEdge = null;
        let bestWeight = Infinity;


        
        // Find smallest edge crossing visited → unvisited
        for (let e of allEdges) {
            let [a, b] = e.split("-");
            if (visited.has(a) !== visited.has(b)) {
                if (edges[e] < bestWeight) {
                    bestWeight = edges[e];
                    bestEdge = e;
                }
            }
        }

        if (!bestEdge) break;

        let [a, b] = bestEdge.split("-");
        let newNode = visited.has(a) ? b : a;

        visited.add(newNode);

        totalWeight += bestWeight;

        activeSteps.push({
            node: newNode,
            edge: bestEdge,
            acceptEdge: bestEdge,
            explain: `Choose edge ${bestEdge} (weight ${bestWeight}). Added ${newNode} to MST.`
        });
    }

    activeSteps.push({
        explain: "<b>Prim's Algorithm complete.</b>"
    });

       activeSteps.push({
       explain: `<br><b>Total weight = ${totalWeight}</b>`
    });

  
    enableAnimation();
    drawGraph();

  
}


/* ===========================================================
   FLOYD–WARSHALL — MATRIX OUTPUT ONLY
   =========================================================== */

function runFloydWarshall() {
    const list = Object.keys(nodes);
    const dist = {};
    let prevDist = {};   // used to store the previous matrix for highlighting the differences

    showFinalTree = false;

    clearPanels();
    resetGraphMemory();
    logExplain("Scroll down for individual path from each node.");

    // Disable animation controls
    document.getElementById("playBtn").disabled = true;
    document.getElementById("stepBtn").disabled = true;

    // Tell user why animations have been disabled
    logStep("Floyd–Warshall is a matrix-based algorithm, therefore step-by-step graph animation is not meaningful.\n\n");
    logStep(`<br>Distances change in each matrix by selecting a shorter route between pairs of nodes than 
           the direct path or any previously considered combination of intermediates e.g. in the initail matrix B-C is infinity, but in matrix k=A it isreduced to 10, because going from B to C via A (distance 10) is shorter than the previously known distance of infinity.`)

    document.getElementById("fwMatricesTitle").style.display = "block";

// ----------------------------------------------------------
// INITIALISE MATRIX
// ----------------------------------------------------------
    list.forEach(a => {
        dist[a] = {};
        prevDist[a] = {};
        list.forEach(b => {
            const val = (a === b ? 0 : Infinity);
            dist[a][b] = val;
            prevDist[a][b] = val;
        });
    });

    // Set direct edge weights
    for (let e in edges) {
        const [a, b] = e.split("-");
        dist[a][b] = edges[e];
        dist[b][a] = edges[e];
        prevDist[a][b] = edges[e];
        prevDist[b][a] = edges[e];
    }

    const mDiv = document.getElementById("fwMatrices");

// ----------------------------------------------------------
// PRINT INITIAL MATRIX (NO HIGHLIGHTING)
// ----------------------------------------------------------
    let initHTML = `<h4>Initial Matrix</h4><table border="1" cellpadding="5" style="border-collapse:collapse;">`;

    initHTML += "<tr><th></th>";
    list.forEach(x => initHTML += `<th>${x}</th>`);
    initHTML += "</tr>";

    for (let i of list) {
        initHTML += `<tr><th>${i}</th>`;
        for (let j of list) {
            const v = dist[i][j];
            initHTML += `<td>${v === Infinity ? "∞" : v}</td>`;
        }
        initHTML += "</tr>";
    }

    initHTML += "</table><br>";
    mDiv.innerHTML += initHTML;

// ----------------------------------------------------------
// FLOYD–WARSHALL MAIN TRIPLE LOOP
// ----------------------------------------------------------
    for (let k of list) {

    // Update distances
        for (let i of list) {
            for (let j of list) {
                const oldVal = dist[i][j];
                const newVal = dist[i][k] + dist[k][j];

                if (newVal < oldVal) {
                    dist[i][j] = newVal;
                }
            }
         }

    // ------------------------------------------------------
    // PRINT MATRIX FOR THIS ITERATION (WITH HIGHLIGHTING)
    // ------------------------------------------------------
        let html = `<h4>k = ${k}</h4><table border="1" cellpadding="5" style="border-collapse:collapse;">`;

        // header
        html += "<tr><th></th>";
        list.forEach(x => html += `<th>${x}</th>`);
        html += "</tr>";

        // body
        for (let i of list) {
            html += `<tr><th>${i}</th>`;
            for (let j of list) {

                const oldVal = prevDist[i][j];
                const newVal = dist[i][j];

                const changed = (oldVal !== newVal);

                html += `
                    <td style="background-color:${changed ? "yellow" : "white"};">
                        ${newVal === Infinity ? "∞" : newVal}
                    </td>`;
            }
            html += "</tr>";
        }

        html += "</table><br>";
        mDiv.innerHTML += html;

    // ------------------------------------------------------
    // SAVE THIS ITERATION FOR NEXT HIGHLIGHTING
    // ------------------------------------------------------
  
        prevDist = structuredClone(dist);

    }

   // Start buttons for paths
    const fwArea = document.getElementById("fwStartButtons");
    fwArea.style.display = "block";

    const colours = ["red", "blue", "green", "orange", "purple", "brown"];
    let ci = 0;

    for (let s of list) {
        const colour = colours[ci++ % colours.length];

        const btn = document.createElement("button");
        btn.textContent = "Paths from " + s;
        btn.classList.add("fwStartBtn");
        btn.onclick = () => highlightFWPaths(s, dist, colour);

        fwArea.appendChild(btn);
    }

    drawGraph();
}


/* ===========================================================
   Floyd–Warshall path highlighting
   =========================================================== */

function highlightFWPaths(start, dist, colour) {

    
  // ----------------------------------------------------------
    // Clear any previous Floyd start-node highlight
    // ----------------------------------------------------------
    permanentlyVisited.clear();                 // remove old FW start node highlight
    permanentlyHighlightedEdges.clear();        // optional: keeps edges clean for FW mode
    drawGraph();                                // redraw clean base graph


    // ----------------------------------------------------------
    // Highlight the starting node for Floyd–Warshall paths
    // ----------------------------------------------------------
    permanentlyVisited.add(start);     // make start node pale yellow
    drawGraph(start, null, colour);    // redraw with highlighted start node

    // For each edge, see if it lies on ANY shortest path from start
    for (let e in edges) {
        let [a, b] = e.split("-");
        let w = edges[e];

        for (let end in dist[start]) {

            if (start === end) continue;

            // Check if the edge is part of a shortest path
            if (dist[start][a] + w + dist[b][end] === dist[start][end] ||
                dist[start][b] + w + dist[a][end] === dist[start][end]) {

                let [x1, y1] = nodes[a];
                let [x2, y2] = nodes[b];
                x1-=36;
                y1+=15;
                x2-=36;
                y2+=15;

                ctx.strokeStyle = colour;
                ctx.lineWidth = 4;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
    }
}


/* ===========================================================
   ANIMATION CONTROL ENABLE / DISABLE
   =========================================================== */

function enableAnimation() {
    document.getElementById("playBtn").disabled = false;
    document.getElementById("stepBtn").disabled = false;
}


/* ===========================================================
   CLOSE BUTTON
   =========================================================== */

document.getElementById("closeBtn").onclick = () => {
    
    window.open('', '_self');
    window.close()

};


/* ===========================================================
   BUTTON HOOKS
   =========================================================== */
   
document.getElementById("runDijkstra").onclick = () => runDijkstra("A");
document.getElementById("runKruskal").onclick = runKruskal;
document.getElementById("runPrim").onclick = runPrim;
document.getElementById("runFW").onclick = runFloydWarshall;

document.getElementById("playBtn").onclick = playSteps;
document.getElementById("stepBtn").onclick = doStep;


/* ===========================================================
   INITIAL DRAW
   =========================================================== */

drawGraph();


