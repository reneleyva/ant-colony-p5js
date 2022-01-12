class Node {
    constructor(id) {
        this.id = id;
        this.neighbours = {}
        this.position = createVector(0, 0);
    }

    setPosition(x, y) {
        this.position = createVector(x, y);
    }

    isNeigbour(node) {
        return node.id in this.neighbours
    }

    connect(node) {
        if (node.id === this.id) {
            throw Error("Intento de conectar el mismo nodo")
        }

        if (!this.isNeigbour(node)) {
            this.neighbours[node.id] = true;
            node.neighbours[this.id] = true;
        }
    }

    disconnect(node) {
        if (this.isNeigbour(node)) {
            delete this.neighbours[node.id];
            delete node.neighbours[this.id];
        }
    }
}


class Graph {
    constructor(N) {
        this.nodes = [];
        for (let i = 0; i < N; i++) {
            this.nodes.push(new Node(i))
        }
    }

    /**
     * Connects and assigns positions to Graph Nodes
     * based on a JSON.
     * JSON of the format: {nodes: [<Node>, <Node>, ... ]}, where Node: 
     * {
     *  "id": 0,
     *  "neighbours":[id1, id2, ..., idn],
     *  "position": {"x": <float>, "y": <float> }
     * }
     * 
     */
    constructGraphFromJSON(jsonObj) {
        const jsonNodes = jsonObj["nodes"];
        jsonNodes.forEach(nodeObj => {
            const id = parseInt(nodeObj.id);
            const neighbours = nodeObj.neighbours;
            const position = nodeObj.position;

            const graphNode = this.nodes[id];
            graphNode.setPosition(parseFloat(position.x), parseFloat(position.y));

            neighbours.forEach(neighId => {
                const graphNeigh = this.nodes[parseInt(neighId)];
                graphNode.connect(graphNeigh);
            })
        })
    }

    connect(id1, id2) {
        if (id1 < this.length && id2 < this.length) {
            const node1 = this.nodes[id1];
            const node2 = this.nodes[id2];
            node1.connect(node2)
        } else {
            throw Error("ID fuera de RANGO!")
        }
    }

    getNodeById(id) {
        return this.nodes[id];
    }

    display() {
        let pairsAlreadyDraw = {};
        this.nodes.forEach(node => {
            noStroke();
            fill(255);
            ellipse(node.position.x, node.position.y, 5);

            Object.keys(node.neighbours).forEach(neiId => {
                if (!(`${neiId}-${node.id}` in pairsAlreadyDraw)) {
                    const neiObj = this.nodes[neiId];
                    stroke(255);
                    line(neiObj.position.x, neiObj.position.y, node.position.x, node.position.y);
                    pairsAlreadyDraw[`${node.id}-${neiId}`] = true;
                }
            })
            
        })
    }
}


class Ant {
    constructor(graph) {
        this.graph = graph;
        const randomNode = random(graph.nodes); 
        this.startNode = randomNode;
        this.position = this.startNode.position.copy();

        this.setRandomNodeDestination();
    }

    setRandomNodeDestination() {
        const randomNeightId = random(Object.keys(this.startNode.neighbours)); 
        const randomNeigh = graph.getNodeById(randomNeightId);

        this.destinationNode = randomNeigh;
        this.currDestinationVec = randomNeigh.position.copy();
    }

    display() {
        noStroke();
        fill("red");
        ellipse(this.position.x, this.position.y, 5);

        fill("blue");
        ellipse(this.currDestinationVec.x, this.currDestinationVec.y, 5);
    }

    
    update() {
        const distToDest = this.position.dist(this.currDestinationVec);
        if(int(distToDest) >= 1) {
            let x1 = this.position.x;
            let y1 = this.position.y;
            let x2 = this.currDestinationVec.x;
            let y2 = this.currDestinationVec.y;

            let m = createVector(x2 - x1, y2 - y1);
            m.normalize();
            this.position.add(m);
        } else {
            // console.log('Done!')
            this.startNode = this.destinationNode;
            this.position = this.currDestinationVec.copy();

            this.setRandomNodeDestination();
        }
    }
}

class AntColony {

    constructor(graph) {
        this.graph = graph;
        this.ants = [];
        for (let i = 0; i < 1; i++) {
            const ant = new Ant(graph);
            this.ants.push(ant);
        }
    }

    display() {
        this.graph.display();
        this.ants.map(ant => ant.display());
    }

    update() {
        this.ants.map(ant => ant.update());
    }
}

let graph;
let colony;

function setup() {
    createCanvas(windowWidth, windowHeight);
    graph = new Graph(1000);
    graph.constructGraphFromJSON(graphJson);
    colony = new AntColony(graph);

}

function draw() {
    background(0);
    colony.display();
    colony.update();
    // noLoop();
}