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

    getNeighboursList() {
        return Object.keys(this.neighbours)
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
        this.bestPath = [];
        this.bestPathDistance = Number.MAX_VALUE;
    }

    setBestPath(path, distance) {
        this.bestPath = path;
        this.bestPathDistance = distance;
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
        if (key1 in this.pheromones) {
            return this.pheromones[key1]
        } else if (key2 in this.pheromones) {
            return this.pheromones[key2]
        } 

        //NO pheromone
        const newPheromone = new Pheromone(i, j);
        this.pheromones[key1] = newPheromone; 

        return newPheromone;
    }

    addPheromoneToEdge(i, j, weight) {
        // "i-j" es lo mismo que "j-i"
        const key1 = i + "-" + j;
        const key2 = j + "-" + i;

        let pheromone = (key1 in this.pheromones) ? this.pheromones[key1] : this.pheromones[key2];

        if (pheromone === undefined) {
            pheromone = new Pheromone(i, j);
        }

        pheromone.updatePheromone(weight);
        pheromone.decay();
        this.pheromones[key1] = pheromone;
    }

    display() {
        let pairsAlreadyDraw = {};
        this.nodes.forEach(node => {
            //Dibuja lineas
            node.getNeighboursList().forEach(neiId => {
                if (!(`${neiId}-${node.id}` in pairsAlreadyDraw)) {
                    const neiObj = this.nodes[neiId];
                    strokeWeight(1);
                    stroke(190, 190, 190);
                    line(neiObj.position.x, neiObj.position.y, node.position.x, node.position.y);
                    pairsAlreadyDraw[`${node.id}-${neiId}`] = true;
                }
            })

            if (node.id === HOME_NODE_ID.toString()) {
                textSize(12);
                fill(0)
                ellipse(node.position.x, node.position.y, 7)
                text("HOME", node.position.x-20, node.position.y-5)
            }

            if (node.id === FOOD_NODE_ID.toString()) {
                textSize(12);
                fill(0)
                ellipse(node.position.x, node.position.y, 7)
                text("FOOD SOURCE", node.position.x-20, node.position.y+20)
            }
        })
    }
}

class Pheromone {
    constructor(i, j) {
        this.decarFactor = 0.8;
        this.realValue = 0;
        this.i = i;
        this.j = j;
    }

    updatePheromone(value) {
        const cost = 1/value;
        this.realValue += cost;
    }

    decay() {
        const currRealValue = this.realValue;
        this.realValue = (1 - this.decarFactor) * currRealValue;
    }

    getRealValue() {
        return this.realValue;
    }
}

class Ant {
    constructor(antId, graph, initailNode, sourceOfFoodNode) {
        this.antId = antId;
        this.graph = graph;
        this.homeNode = initailNode;
        this.startNode = initailNode;
        this.position = this.startNode.position.copy();

        this.sourceOfFoodNode = sourceOfFoodNode;
        this.arrivedAtSourceOfFood = false;

        //FOR TEST!
        this.startNode.visited = true;

        this.backTrackPath = [];
        this.pathTaken = [];
        this.bestPathIndex = 0;
        this.nodesVisited = {};
        this.nodesVisited[this.homeNode.id] = true;
        this.c_heur = 1; 
        this.c_hist = 2.5;

        this.currDistanceWalked = 0;
        //Decides a new destination from the start
        const nextNode = this.chooseNextDestinationNode();
        this.setDestinationByNode(nextNode);
        
    }

    setDestinationByNode(node) {
        this.destinationNode = node;
        this.currDestinationVec = node.position.copy();
    }

    display() {
        if (this.arrivedAtSourceOfFood) {
            stroke(0)
            fill(0, 158, 32);
        } else {
            stroke(0);
            fill(255, 0, 0);
        }

        ellipse(this.position.x, this.position.y, 5);
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
        const nextId = this.backTrackPath.pop();
        this.pathTaken.push(nextId);

        if (nextId !== undefined) {
            return this.graph.getNodeById(nextId);
        } else {
            throw Error("Call to backtrack with no elements")
        }
    }

    getPreviousNodeToHome() {
        const neighboursIds = this.startNode.getNeighboursList();
        // Busca su casa
        let nextNode;
        if (neighboursIds.includes(this.homeNode.id)) {
            nextNode = this.homeNode;
        } else{
            nextNode = this.getPreviousNodeFromBackTrack();
        }

        const i = this.startNode.id;
        const j = nextNode.id; 
        this.graph.addPheromoneToEdge(i, j, this.currDistanceWalked); 
        return nextNode;
    }

    isSomeNeighbourFood(neighboursIds) {
        return neighboursIds.includes(this.sourceOfFoodNode.id)
    }

    getProbabilityByPheromone(pher) {
        const indexDest = (this.startNode.id === pher.i) ? pher.j : pher.i;
        const destNode = this.graph.getNodeById(indexDest);
        const distance = this.startNode.position.dist(destNode.position);

        const history = pow(pher.realValue, this.c_heur);
        const heur = pow((1/distance), this.c_hist);

        return {
            cities: {i: pher.i, j: pher.j},
            prob: history * heur
        }
    }

    /**
     * Elige por ruleta la feromona más fuerte
     * @param {array} neighboursPheromones. 
     */
    chooseByPheromones(neighboursIds) {
        const neighboursPheromones = neighboursIds.map(nId => {
            const pher = this.graph.getEdgePheromone(this.startNode.id, nId)
            return this.getProbabilityByPheromone(pher)
        });

        let sumOfPheromoneVals = 0;
        neighboursPheromones.forEach(p => sumOfPheromoneVals += p.prob);

        let choosenPheromone = random(neighboursPheromones);
        
        if (sumOfPheromoneVals === 0) {
            const index = (this.startNode.id === choosenPheromone.cities.i) ? choosenPheromone.cities.j : choosenPheromone.cities.i;
            const nextNode =  graph.getNodeById(index);
            this.backTrackPath.push(this.startNode.id);
            return nextNode;
        }

        for (let i = 0; i < neighboursPheromones.length; i++) {
            const currP = neighboursPheromones[i];
            const realVal = currP.prob;
            const range = (realVal * 100) / sumOfPheromoneVals;
            const r = random(100);
          
            if (r <= range) {
                choosenPheromone = currP;
                break;
            }
        }

        const index = (this.startNode.id === choosenPheromone.cities.i) ? choosenPheromone.cities.j : choosenPheromone.cities.i;
        const nextNode =  graph.getNodeById(index);
        this.backTrackPath.push(this.startNode.id);
        return nextNode;
    }

    getBestPathNextNode() {
        const nextId = this.graph.bestPath[this.bestPathIndex]; 
        const nextNode = this.graph.getNodeById(nextId);
        this.bestPathIndex++;
        return nextNode;
    }

    chooseNextDestinationNode() {
        if (this.arrivedAtSourceOfFood) {
            return this.getPreviousNodeToHome();
        }

        const neighboursIds = this.startNode.getNeighboursList().filter(nId => !(nId in this.nodesVisited));

        if (this.isSomeNeighbourFood(neighboursIds)) {
            this.arrivedAtSourceOfFood = true;
            this.backTrackPath.push(this.startNode.id);
            return this.sourceOfFoodNode;
        }

        if (this.followBestPath) {
            this.backTrackPath.push(this.startNode.id);
            return this.getBestPathNextNode();
        }

        if (neighboursIds.length > 0) {
            return this.chooseByPheromones(neighboursIds);
        } 

        const backNode = this.getPreviousNodeFromBackTrack();
        this.currDistanceWalked -= this.startNode.position.dist(backNode.position);
        return backNode;
    }

    resetAnt() {
        this.startNode = this.destinationNode;
        this.arrivedAtSourceOfFood = false;
        this.backTrackPath = [];
        this.nodesVisited = {};
        this.nodesVisited[this.homeNode.id] = true;
        this.pathTaken = [];
        this.currDistanceWalked = 0;
        this.bestPathIndex = 0;
        this.followBestPath = BEST_PATH;
        const nextNode = this.chooseNextDestinationNode();
        this.setDestinationByNode(nextNode);
    }

    update() {
        const distToDest = this.position.dist(this.currDestinationVec)
        if(int(distToDest) >= speed_slider.value()) {
            const m = this.getDirectionVectorByDestination();
            this.position.add(m.mult(speed_slider.value()));
        } else {
            if (this.destinationNode.id == this.homeNode.id) {
                this.position = this.homeNode.position.copy();
                if (this.currDistanceWalked < this.graph.bestPathDistance) {
                    this.graph.setBestPath(this.pathTaken.reverse(), this.currDistanceWalked); 

                    BEST_PATH_DISTANCE = this.currDistanceWalked; 
                }

                this.resetAnt();
                return;
            };
            
            // LLegó al nodo destino. Debemos elegir un próximo nodo            
            // Su nodo actual es el destino
            this.currDistanceWalked += this.startNode.position.dist(this.destinationNode.position);

            this.startNode = this.destinationNode;

            this.startNode.visited = true;
            this.nodesVisited[this.startNode.id] = true;
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
        const initialNode = graph.nodes[HOME_NODE_ID];
        const sourceOfFoodNode = graph.nodes[FOOD_NODE_ID];
        const NUMBER_OF_ANTS = 400; 

        for (let i = 0; i < NUMBER_OF_ANTS; i++) {
            const ant = new Ant(i, graph, initialNode, sourceOfFoodNode);
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
let speed_slider;
let BEST_PATH = false;
const HOME_NODE_ID = 367;
const FOOD_NODE_ID = 103;
let BEST_PATH_DISTANCE = -1;

function setup() {
    createCanvas(windowWidth, 800);
    graph = new Graph(graphJson.nodes.length);
    graph.constructGraphFromJSON(graphJson);
    colony = new AntColony(graph);
    button3 = createButton("TAKE BEST PATH!!");
    button3.mousePressed(toggleBestPath);
    speed_slider = createSlider(0, 150, 5, 1);
    speed_slider.position(300, height+17);
}

function toggleBestPath() {
    BEST_PATH = !BEST_PATH; 
}

function drawText() {
    fill(0);
    textStyle(NORMAL);
    strokeWeight(0);
    textSize(15);
    text("Ants Speed", 300, height-10);
    textSize(17);
    text(`Current Best Path Distance: ${BEST_PATH_DISTANCE.toFixed(2)}`, 700, height-10)
}

function draw() {
    background(255);
    drawText()
    colony.display();
    colony.update();
    
}