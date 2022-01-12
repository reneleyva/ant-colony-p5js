class Node {
    constructor(id) {
        this.id = id;
        this.neighbours = {}
        this.position = createVector(0, 0);
        this.visited = false; //TEST!
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
            const id = nodeObj.id;
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

    getNodeById(strId) {
        return this.nodes[int(strId)];
    }

    display() {
        let pairsAlreadyDraw = {};
        this.nodes.forEach(node => {
            // noStroke();
            if (node.visited) {
                fill("green");
            } else {
                fill(0)
            }

            text(node.id, node.position.x, node.position.y)

            Object.keys(node.neighbours).forEach(neiId => {
                if (!(`${neiId}-${node.id}` in pairsAlreadyDraw)) {
                    const neiObj = this.nodes[neiId];
                    stroke(117, 117, 117);
                    line(neiObj.position.x, neiObj.position.y, node.position.x, node.position.y);
                    pairsAlreadyDraw[`${node.id}-${neiId}`] = true;
                }
            })
            
        })
    }
}


/**
 * Estructura de datos para buscar valor en tiempo O(1)
 * Agregar sin repeticiones in O(1)
 * Y hacer pop en O(1). 
 * Teniendo 2 copias de los mismos valores en un arreglo y un diccionario.
 */
class SetStack {
    constructor() {
        this.array = [];
        this.set = {};
    }

    size() {
        return this.array.length
    }

    has(value) {
        return value in this.set;
    }

    get(index) {
        return this.array[index];
    }

    add(value) {
        if (!(value in set)) {
            this.array.push(value);
            this.set[value] = true;
        }
    }

    bulkAdd(array) {
        array.forEach(value => this.add(value))
    }

    isEmpty() {
        return this.array.length === 0;
    }

    pop() {
        if (!this.isEmpty()) {
            const value = this.array.pop();
            delete this.set[value];
            return value; 
        }
    }
}


class Ant {
    constructor(graph, initailNode) {
        this.graph = graph;
        this.startNode = initailNode;
        //FOR TEST!
        this.startNode.visited = true;

        this.position = this.startNode.position.copy();

        this.setRandomNodeDestination();
        this.nodesVisitedSetStack = new SetStack() // nodos que ha visitado
        this.nodesVisitedSetStack.add(this.startNode.id); // Agregamos primero nodo como visitado

        // Nodos a visitar
        this.nodesToVisitSetStack = new SetStack();
        this.nodesToVisitSetStack.bulkAdd(Object.keys(initailNode.neighbours))

        this.backTrackPath = [];
        this.backTrackPath.push(this.startNode.id);
        this.exploredAllNodes = false; // TEST! Exploró todos los nodos
    }

    setRandomNodeDestination() {
        const randomNeightId = random(Object.keys(this.startNode.neighbours)); 
        const randomNeigh = graph.getNodeById(randomNeightId);

        this.destinationNode = randomNeigh;
        this.currDestinationVec = randomNeigh.position.copy();
    }

    display() {
        if (this.exploredAllNodes) {
            fill(0, 255, 0);
        } else {
            fill(255, 0, 0);
        }

        stroke(0);
        ellipse(this.position.x, this.position.y, 5);

        // fill("green");
        // ellipse(this.currDestinationVec.x, this.currDestinationVec.y, 5);
    }

    /**
     * Obtiene el vector de direccion para mover 
     * a la hormiga en dirección al siguiente nodo.
     */
    getDirectionVectorByDestination() {
        let x1 = this.position.x;
        let y1 = this.position.y;
        let x2 = this.currDestinationVec.x;
        let y2 = this.currDestinationVec.y;

        let m = createVector(x2 - x1, y2 - y1);
        m.normalize();
        return m
    }

    setDestinationByNode(node) {
        this.destinationNode = node;
        this.currDestinationVec = node.position.copy();
    }

    chooseNextDestinationNode() {        
        const neighboursIds = Object.keys(this.startNode.neighbours);
        const notVisitedNeighbours = neighboursIds.filter(nId => !this.nodesVisitedSetStack.has(nId));
        console.log('backtracking =>', this.backTrackPath)

        if (notVisitedNeighbours.length > 0) {
            const nextId = random(notVisitedNeighbours);
            const newDestinationNode = this.graph.getNodeById(nextId);
            this.setDestinationByNode(newDestinationNode);
            this.backTrackPath.push(this.startNode.id);
        } else {
            // BackTrack hasta que encuentre vecinos sin explorar
            const nextId = this.backTrackPath.pop();
            if (nextId !== undefined) {
                const nextNode = this.graph.getNodeById(nextId);
                this.setDestinationByNode(nextNode)
            } else {
                console.log('ACABO!!!')
            }
        }

    }

    update() {
        const distToDest = this.position.dist(this.currDestinationVec)
        if(int(distToDest) >= 1) {
            const m = this.getDirectionVectorByDestination();
            this.position.add(m.mult(1.2));
        } else {
            // LLegó al nodo destino. Debemos elegir un próximo nodo            
            // Su nodo actual es el destino
            this.startNode = this.destinationNode;
            this.position = this.currDestinationVec.copy();
            
            // FOR TEST!
            this.destinationNode.visited = true;

            //Agregamos el destino a los visitados
            this.nodesVisitedSetStack.add(this.destinationNode.id);

            // Elegimos un próximo nodo
            this.chooseNextDestinationNode();
            // this.setRandomNodeDestination();
        }
    }
}

class AntColony {

    constructor(graph) {
        this.graph = graph;
        this.ants = [];
        // const initialNode = random(graph.nodes)
        const initialNode = graph.nodes[3]
        for (let i = 0; i < 1; i++) {
            const ant = new Ant(graph, initialNode);
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
    graph = new Graph(graphJson.nodes.length);
    graph.constructGraphFromJSON(graphJson);
    colony = new AntColony(graph);
    button = createButton("play");
    button.mousePressed(togglePlaying);
}

function togglePlaying() {
    PLAY = !PLAY; 
}

let PLAY = true;

function draw() {
    if (PLAY) {
        background("lightgrey");
        colony.display();
        colony.update();
    }
    // noLoop();
}