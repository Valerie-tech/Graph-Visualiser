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
let fwHighlightedEdges = new Map();
let tempHighlightedEdges = new Set();

const fwColours = ["red", "blue", "green", "orange", "purple", "brown"];
let fwColourIndex = 0;



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
   edgeColour:    colour for edge highlight
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
        } else if (tempHighlightedEdges.has(e)) {
            colour = "yellow";    // TEMP highlight
            width = 4;
        } else if (typeof fwHighlightedEdges !== "undefined" &&
            fwHighlightedEdges.has(e)) {
            colour = fwHighlightedEdges.get(e);   // FW highlight colour  
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

    /* Node highlight */
    if (st.node) {
        permanentlyVisited.add(st.node);
    }

    /* Permanent MST/SPT edge highlight */
    if (st.acceptEdge) {
        permanentlyHighlightedEdges.add(st.acceptEdge);
    }

    /* Temporary yellow highlight (Kruskal skip-step) */
    if (st.tempHighlight) {
        tempHighlightedEdges.add(st.tempHighlight);
    }

    /* Remove temporary highlight */
    if (st.removeTempHighlight) {
        tempHighlightedEdges.delete(st.removeTempHighlight);
    }

    /* Node highlighting for Kruskal */
    if (st.highlightNodes) {
        for (let n of st.highlightNodes) {
            permanentlyVisited.add(n);
        }
    }

    if (st.explain) logExplain(st.explain);

    drawGraph(st.node, st.edge);
    stepIndex++;

    
  if (stepIndex >= activeSteps.length && showFinalTree) {
        drawFinalDijkstraTree();   // Display final SPT
  }

}


function playSteps() {
    if (!activeSteps.length) return;
    playInterval = setInterval(() => {
        if (stepIndex >= activeSteps.length) {
            clearInterval(playInterval);
            if (showFinalTree) {
               drawFinalDijkstraTree();
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
    fwHighlightedEdges.clear();
    drawGraph();
}


// To ensure calculations work in both directions - e.g. A-C AND C-A
function norm(u, v) {
    return u < v ? `${u}-${v}` : `${v}-${u}`;
}


/* ===========================================================
   DIJKSTRA — step-by-step + final SPT redraw
   =========================================================== */

let finalPrev = {};   // store Dijkstra parent tree
let finalDist = {};   // store final Dijkstra distances

function runDijkstra(startNode) {
    const start = startNode;
    showFinalTree = true;

    clearPanels();
    resetGraphMemory();
    enableAnimation();

    activeSteps = [];
    stepIndex = 0;

    logExplain("<b>Dijkstra Algorithm - Shortest Path Tree (from " + start + ")</b>");
    logExplain(`
            <br><b>What it finds:</b>
               The shortest route from one chosen start node to every other node.
            <br><b>Key idea:
               It grows outward from the start node, always choosing the closest unvisited node next.
               It produces a Shortest Path Tree (SPT) —
                 a branching structure where each node has the cheapest route from the start only.
            <br>Optimises:</b>
               Distance from the start node
            <br><b>Depends on starting node?</b>
                Yes — changing the start changes the entire tree
            <br><b>Analogy:</b>
               Like planning a road network from your house to reach all other towns as cheaply as possible individually.<br>
`)

    /* -------------------------
       Build adjacency list
       ------------------------- */
    const adjacency = {};
    for (const key in edges) {
        const [u, v] = key.split("-");
        const w = edges[key];

        if (!adjacency[u]) adjacency[u] = [];
        if (!adjacency[v]) adjacency[v] = [];

        adjacency[u].push({ node: v, weight: w });
        adjacency[v].push({ node: u, weight: w });
    }

    /* -------------------------
       Initialise tables
       ------------------------- */
    const dist = {};
    const prev = {};
    const visited = new Set();

    for (const n in nodes) {
        dist[n] = Infinity;
        prev[n] = null;
    }
    dist[start] = 0;

    /* -------------------------
       Extract minimum helper
       ------------------------- */
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

    /* -------------------------
       MAIN LOOP (step-by-step)
       ------------------------- */
    while (true) {
        const current = extractMin();
        if (!current) break;

        visited.add(current);

        activeSteps.push({
            node: current,
            edge: null,
            explain: `Visiting <b>${current}</b> — closest unvisited node (distance = ${dist[current]}).`
        });

        for (const adj of adjacency[current]) {
            const nbr = adj.node;
            const w = adj.weight;

            if (visited.has(nbr)) continue;

            const newDist = dist[current] + w;

            if (newDist < dist[nbr]) {

                const edge = norm(current, nbr);

                activeSteps.push({
                    node: nbr,
                    edge,
                    explain:
                        `Considering edge ${edge} (weight ${w}).<br>
                         New distance = ${newDist}, old = ${dist[nbr]}.<br>
                         Updating path to ${nbr}.`
                });

                dist[nbr] = newDist;
                prev[nbr] = current;
            }
        }
    }

    /* Save final parent + distance tables */
    finalPrev = { ...prev };
    finalDist = { ...dist };

    /* Animation ends → final SPT will be shown by drawFinalDijkstraTree() */
    return { dist, prev };
}


/* ===========================================================
   DRAW FINAL DIJKSTRA SPT (clean redraw)
   =========================================================== */

function drawFinalDijkstraTree() {

    permanentlyHighlightedEdges.clear();
    permanentlyVisited.clear();
    fwHighlightedEdges.clear();

    logExplain("<h3>Final Shortest-Path Tree</h3>");

    let totalWeight = 0;

    /* ------------------------------------------------------
       Sort nodes by final distance so SPT prints correctly
       ------------------------------------------------------ */
    const sortedNodes = Object.keys(finalPrev)
        .filter(n => finalPrev[n] !== null)
        .sort((a, b) => finalDist[a] - finalDist[b]);

    for (const node of sortedNodes) {
        const parent = finalPrev[node];
        if (!parent) continue;

        const edge = norm(parent, node);

        permanentlyHighlightedEdges.add(edge);
        permanentlyVisited.add(node);
        permanentlyVisited.add(parent);

        totalWeight += edges[edge];

        logExplain(`Tree edge: <b>${edge}</b> (weight ${edges[edge]})`);
    }

    logExplain(`<br><b>Total SPT Weight = ${totalWeight}</b><br>`);

    drawGraph();
}


/* ===========================================================
   KRUSKAL’S MINIMUM SPANNING TREE (with temp skip highlights)
   =========================================================== */

function runKruskal() {
    showFinalTree = false;

    clearPanels();
    resetGraphMemory();
    enableAnimation();

    activeSteps = [];
    stepIndex = 0;

    totalWeight = 0;

    logExplain("<b>Kruskal's Algorithm</b><br>");
    logExplain(`<b>What it finds:</b>
                  The same thing as Prim — a Minimum Spanning Tree.
                  The tree that connects all nodes with the smallest possible total cost.
                <br><b>Key idea:
                   Sort all edges by weight and add them one by one, skipping any edge that would cause a cycle.
                <br>What the result looks like:</b>
                     A Minimum Spanning Tree (MST) —
                       the cheapest possible full network structure.
                <br><b>Optimises:</b>
                   <i>Total</i> tree weight
                <br><b>Depends on starting node?</b>
                   No — Kruskal ignores starting nodes.
                <br><b>Analogy:</b>
                   Like choosing cables for a network by sorting all prices and buying the cheapest that doesn’t cause problems.<br><br>

`)

    /* --------------------
       Sort edges by weight
       -------------------- */
    const sorted = Object.keys(edges)
        .map(e => ({ edge: e, w: edges[e] }))
        .sort((a, b) => a.w - b.w);

    let sortedListHTML = "";
    sorted.forEach(item => {
        sortedListHTML += `${item.edge} (weight ${item.w})<br>`;
    });

    logExplain("<b>Sorted edges:</b><br>" + sortedListHTML + "<br>");

    /* --------------------
       Union-Find
       -------------------- */
    const parent = {};
    Object.keys(nodes).forEach(n => parent[n] = n);

    // If x is the root → return x.
    const find = x => parent[x] === x ? x : parent[x] = find(parent[x]);
    const union = (a, b) => parent[find(a)] = find(b); // Determine if the edge is already connected

    /* --------------------
       MAIN LOOP
       -------------------- */
    for (let { edge, w } of sorted) {

        let [a, b] = edge.split("-");

        /* STEP 1 — highlight yellow */
        activeSteps.push({
            tempHighlight: edge,
            explain: `Considering edge <b>${edge}</b> (weight ${w})...`
        });

        /* Check for cycle */
        if (find(a) !== find(b)) {

            /* STEP 2 — remove yellow + accept edge */
            activeSteps.push({
                removeTempHighlight: edge,
                acceptEdge: edge,
                highlightNodes: [a, b],
                explain: `Adding <b>${edge}</b> to MST.`
            });

            union(a, b);
            totalWeight += w;

        } else {

            /* STEP 2 — remove yellow + skip edge */
            activeSteps.push({
                removeTempHighlight: edge,
                explain: `${edge} <b>skipped</b> — would form a cycle.`
            });
        }
    }

    activeSteps.push({
        explain: `<br><b>Total Weight = ${totalWeight}</b>`
    });

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

    logExplain("<b>Prim's Algorithm - Minimum Spanning Tree</b>:");
    logExplain (`<br><b>What it finds:</b>
                   The same thing as Kruksal — a Minimum Spanning Tree.
                   The tree that connects all nodes with the smallest possible total cost.
                <br><b>Key idea:
                   Start anywhere, then always take the cheapest edge that connects the growing tree to a new node.
                <br>What the result looks like:</b>
                   A Minimum Spanning Tree (MST) —
                     a cheapest possible full network structure.
                <br><b>Optimises:</b>
                    <i>Total</i> weight of the entire tree<br>
                    Distance from any specific start node
                <br><b>Depends on starting node?</b>
                    NO — the final MST is the same regardless of where you start (except when there are ties).
                <br><b>Analogy:</b>
                    Like building a utility network (e.g. electricity) as cheaply as possible overall.

`)

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

    // Disable animation controls
    document.getElementById("playBtn").disabled = true;
    document.getElementById("stepBtn").disabled = true;
    document.getElementById("playBtn").title="";
    document.getElementById("stepBtn").title="";

    logExplain(`<b>What it finds:</b>
                   The shortest distances between <i>every</i> pair of nodes in the graph
                <br><b>Key idea:
                   Gradually improve the shortest path distances by examining each node (k) as a possible “middle point” on a route.
                   </b>For every pair of nodes (i, j), it tests:
                       Is going from i → k → j shorter than the current best i → j distance?
                       If yes, update the matrix.
                   Repeating this for every k eventually reveals all the indirect routes which are better than the direct routes.
                <br><b>What the result looks like</b>
                     A complete matrix of shortest distances between every pair
                <br><b>(Optionally) a map of all shortest paths</b>
                     It does not produce a single tree - it produces many possible trees depending on the starting node
                <br><b>Optimises</b>
                     Shortest distance between <i>every</i> pair of nodes
                <br><b>Depends on starting node?</b>
                      No - The algorithm computes <i>all pairs</i> shortest paths in one run.
                 <br>If the user later wants paths “from A” or “from B”, they are simply extracted from the result matrix - the algorithm itself does not run again.
`)

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

    for (let s of list) {

        const colour = fwColours[fwColourIndex++ % fwColours.length];

        const btn = document.createElement("button");
        btn.textContent = "Paths from " + s;
        btn.classList.add("fwStartBtn");
        btn.onclick = () => highlightFWPaths(s, dist, colour);

        fwArea.appendChild(btn);
    }

    drawGraph();
}

/* ===========================================================
   preparation for path highlighting
   =========================================================== */

function displayCoords(nodeName) {
    let [x, y] = nodes[nodeName];
    x -= 35;   // SAME OFFSET AS drawGraph()
    y += 15;
    return [x, y];
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
    fwHighlightedEdges.clear();    
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

                    fwHighlightedEdges.set(e, colour);
           
            }
        }
    }

    drawGraph(start, null, colour);
}


/* ===========================================================
   ANIMATION CONTROL ENABLE / DISABLE
   =========================================================== */

function enableAnimation() {
    document.getElementById("playBtn").disabled = false;
    document.getElementById("stepBtn").disabled = false;

    document.getElementById("playBtn").title="Play all seps automatically";
    document.getElementById("stepBtn").title="Step through each stage of the algorithm";

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
