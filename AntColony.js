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
            this.nodes.push(new Node(i.toString()))
        }
        this.pheromones = {};
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

    getEdgePheromone(i, j) {
        // "i-j" es lo mismo que "j-i"
        const key1 = i + "-" + j;
        const key2 = j + "-" + i;
        if (key1 in this.pheromones) return this.pheromones[key1];

        return this.pheromones[key2];
    }

    addPheromoneToEdge(i, j, weight) {
        const key1 = i + "-" + j;
        const key2 = j + "-" + i;

        if (key1 in this.pheromones) {
            // Si key1 está key2 también
            this.pheromones[key1].addValue(weight);
            this.pheromones[key2].addValue(weight);

        } else {
            // Ninguna está
            const pheromone = new Pheromone(); 
            pheromone.addValue(weight);

            this.pheromones[key1] = pheromone;
            this.pheromones[key2] = pheromone;
        }
    }

    //TESTING!
    printPheromones() {
        let res = {}
        Object.keys(this.pheromones).forEach(key => {
            const pher = this.pheromones[key];
            res[key] = pher.getRealValue();
        })

        console.table(res);
    } 

    update() {
        //Update Pheromones 
        Object.keys(this.pheromones).forEach(key => {
            this.pheromones[key].decay();
        })
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

class Pheromone {
    constructor() {
        this.decay_factor = 0.5;
        this.real_value = 0;
        this.costSum = 0; 
    }

    addValue(value) {
        // Update value
        const cost = 1/(value);
        this.costSum += cost;
        // console.log("cost", cost)

        const currRealValue =  this.real_value;
        this.real_value = ((1 - this.decay_factor) * currRealValue) + this.costSum;
    }

    decay() {
        //Decay Pheromone
        const currRealValue = this.real_value;
        this.real_value = ((1 - this.decay_factor) * currRealValue) + this.costSum;
    }

    getRealValue() {
        return this.real_value;
    }
}

class Ant {
    constructor(graph, initailNode, sourceOfFoodNode) {
        this.graph = graph;
        this.homeNode = initailNode;
        this.startNode = initailNode;
        this.position = this.startNode.position.copy();
        this.speed = 8;

        this.sourceOfFoodNode = sourceOfFoodNode;
        this.arrivedAtSourceOfFood = false;

        //FOR TEST!
        this.startNode.visited = true;

        this.nodesVisited = {} // nodos que ha visitado
        this.nodesVisited[this.startNode.id] = true; // Agregamos primero nodo como visitado

        this.backTrackPath = [];
        //Decides a new destination from the start
        const nextNode = this.chooseNextDestinationNode();
        this.setDestinationByNode(nextNode);
    }

    setDestinationByNode(node) {
        this.destinationNode = node;
        this.currDestinationVec = node.position.copy();
    }

    /**
     * For testing
     */
    setRandomNodeDestination() {
        const randomNeightId = random(Object.keys(this.startNode.neighbours)); 
        const randomNeigh = graph.getNodeById(randomNeightId);

        this.destinationNode = randomNeigh;
        this.currDestinationVec = randomNeigh.position.copy();
    }

    display() {
        fill(255, 0, 0);
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

    

    getPreviousNodeFromBackTrack() {
        // Check if next is home and change variable

        /*************
         * Hacer prueba donde se checa si el proximo es vecino, sino lanzar error. 
         */
        const nextId = this.backTrackPath.pop();
        if (nextId !== undefined) {
            const nextNode = this.graph.getNodeById(nextId);
            return nextNode;
        }
    }

    getPreviousNodeToHome(neighboursIds) {
        // Busca su casa
        let nextNode;
        if (neighboursIds.includes(this.homeNode.id)) {
            nextNode = this.homeNode;
        } else {
            nextNode = this.getPreviousNodeFromBackTrack()
        }
        
        const i = this.startNode.id;
        const j = nextNode.id; 
        const distance = this.startNode.position.dist(nextNode.position);
        this.graph.addPheromoneToEdge(i, j, distance);

        return nextNode;
    }

    isSomeNeighbourFood(neighboursIds) {
        return neighboursIds.includes(this.sourceOfFoodNode.id)
    }


    chooseNextDestinationNode() {
        const neighboursIds = Object.keys(this.startNode.neighbours);

        if (this.arrivedAtSourceOfFood) {
            return this.getPreviousNodeToHome(neighboursIds);
        }

        //IF Alguno de sus vecinos es comida? 
            // Vamos a la comiuda
            // Bandera de comida true
        
        //ELSE 
            //EXPLORAR NORMAL, ver vecinos no visitados sino backtrack

        if (this.isSomeNeighbourFood(neighboursIds)) {
            this.arrivedAtSourceOfFood = true;
            return this.sourceOfFoodNode;
        }
        
        const notVisitedNeighbours = neighboursIds.filter(nId => !(nId in this.nodesVisited));

        if (notVisitedNeighbours.length > 0) {
            const nextId = random(notVisitedNeighbours);
            const newDestinationNode = this.graph.getNodeById(nextId);
            this.backTrackPath.push(newDestinationNode.id);
            return newDestinationNode;
        }

        return this.getPreviousNodeFromBackTrack();
    }

    resetAnt() {
        this.startNode = this.destinationNode;
        this.arrivedAtSourceOfFood = false;
        this.nodesVisited = {};
        this.nodesVisited[this.startNode.id] = true;
        this.backTrackPath = [];

        const nextNode = this.chooseNextDestinationNode();
        this.setDestinationByNode(nextNode);
        this.graph.printPheromones();
    }

    printAnt() {
        let res = {}; 
        res["backtrack"] = this.backTrackPath.toString();
        res["Visited"] = Object.keys(this.nodesVisited).toString();
        res["CurrNode"] = this.startNode.id;
        res["Destination"] = this.destinationNode.id;
        res["FoundedFood?"] = this.arrivedAtSourceOfFood;
        console.table(res);
    }
    
    update() {
        const distToDest = this.position.dist(this.currDestinationVec)
        if(int(distToDest) >= this.speed) {
            const m = this.getDirectionVectorByDestination();
            this.position.add(m.mult(this.speed));
        } else {
            // this.printAnt();
            if (this.destinationNode.id == this.homeNode.id) {
                this.position = this.homeNode.position.copy();
                this.resetAnt();
                return;
            };
            
            // this.graph.printPheromones(); // TO TEST! 
            // LLegó al nodo destino. Debemos elegir un próximo nodo            
            // Su nodo actual es el destino
            this.startNode = this.destinationNode;
            this.nodesVisited[this.destinationNode.id] = true;

            this.startNode.visited = true;
            this.position = this.currDestinationVec.copy();


            //elegimos proximo nodo deacuerdo a su estado
            const nextNode = this.chooseNextDestinationNode();
            this.setDestinationByNode(nextNode);
        }
    }
}

class AntColony {

    constructor(graph) {
        this.graph = graph;
        this.ants = [];
        // const initialNode = random(graph.nodes)
        const initialNode = graph.nodes[4];
        const sourceOfFoodNode = graph.nodes[5]; 
        const NUMBER_OF_ANTS = 10; 

        for (let i = 0; i < NUMBER_OF_ANTS; i++) {
            const ant = new Ant(graph, initialNode, sourceOfFoodNode);
            this.ants.push(ant);
        }
    }

    display() {
        this.graph.display();
        this.graph.update();
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