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
        if (key1 in this.pheromones) {
            return this.pheromones[key1]
        } else if (key2 in this.pheromones) {
            return this.pheromones[key2]
        } 

        //NO pheromone
        const newPheromone = new Pheromone(i, j);
        newPheromone.addValue(1000);
        this.pheromones[key1] = newPheromone; 

        return newPheromone;
    }

    addPheromoneToEdge(i, j, weight) {
        console.log('Adding pheromone', i, j)
        // "i-j" es lo mismo que "j-i"
        const key1 = i + "-" + j;
        const key2 = j + "-" + i;

        const pheromone = (key1 in this.pheromones) ? this.pheromones[key1] : this.pheromones[key2];

        if (pheromone !== undefined) {
            pheromone.addValue(weight)
        } else {
            const pheromone = new Pheromone(i, j); 
            pheromone.addValue(weight);

            this.pheromones[key1] = pheromone;
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
    constructor(i, j) {
        this.decarFactor = 0.5;
        this.realValue = 0;
        this.costSum = 0;
        this.i = i; 
        this.j = j;
    }

    addValue(value) {
        // Update value
        const cost = 1/(value);
        this.costSum += cost;
        // console.log("cost", cost)

        const currRealValue = this.realValue;
        this.realValue = ((1 - this.decarFactor) * currRealValue) + this.costSum;
    }

    decay() {
        //Decay Pheromone
        const currRealValue = this.realValue;
        this.realValue = ((1 - this.decarFactor) * currRealValue) + this.costSum;
    }

    getRealValue() {
        return this.realValue;
    }
}

class Ant {
    constructor(graph, initailNode, sourceOfFoodNode) {
        this.graph = graph;
        this.homeNode = initailNode;
        this.startNode = initailNode;
        this.position = this.startNode.position.copy();
        this.speed = 3;

        this.sourceOfFoodNode = sourceOfFoodNode;
        this.arrivedAtSourceOfFood = false;

        //FOR TEST!
        this.startNode.visited = true;

        this.backTrackPath = [];
        this.nodesVisited = {};
        this.nodesVisited[this.homeNode.id] = true;

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
        // console.log('Backtracking!')
        const nextId = this.backTrackPath.pop();

        // TEST
        const neighboursIds = Object.keys(this.startNode.neighbours)
        if (!neighboursIds.includes(nextId)) throw Error("Backtracking to Node thats not a neighbour")

        if (nextId !== undefined) {
            return this.graph.getNodeById(nextId);
        } else {
            throw Error("Call to backtrack with no elements")
        }
    }

    getPreviousNodeToHome() {
        console.log('Retuning Home')
        const neighboursIds = Object.keys(this.startNode.neighbours);
        // Busca su casa
        if (neighboursIds.includes(this.homeNode.id)) {
            // console.log('HOME!')
            return this.homeNode;
        }

        const nextNode = this.getPreviousNodeFromBackTrack()
        const i = this.startNode.id;
        const j = nextNode.id; 
        const distance = this.startNode.position.dist(nextNode.position);
        this.graph.addPheromoneToEdge(i, j, distance);
        
        return nextNode;
    }

    isSomeNeighbourFood(neighboursIds) {
        return neighboursIds.includes(this.sourceOfFoodNode.id)
    }

    /**
     * Elige por ruleta la feromona más fuerte
     * @param {array} neighboursPheromones. 
     */
    chooseByPheromones(neighboursIds) {
        const neighboursPheromones = neighboursIds.map(nId => this.graph.getEdgePheromone(this.startNode.id, nId));
        // console.log('Choose by Pheromones!', neighboursPheromones)
        let sumOfPheromoneVals = 0;
        neighboursPheromones.forEach(p => sumOfPheromoneVals += p.realValue);
        // console.log('sumOfPheromoneVals', sumOfPheromoneVals)
        // neighboursPheromones.sort((a, b) => a.real_value - b.real_value)

        let choosenPheromone = random(neighboursPheromones);

        //TEST 
        let res = {};
        for (let i = 0; i < neighboursPheromones.length; i++) {
            const currP = neighboursPheromones[i];
            const realVal = currP.realValue;

            const range = (realVal * 100) / sumOfPheromoneVals;

            res[`Pheromone-${currP.i}-${currP.j}`] = range;
        }

        console.table(res)

        for (let i = 0; i < neighboursPheromones.length; i++) {
            const currP = neighboursPheromones[i];
            const realVal = currP.realValue;

            const range = (realVal * 100) / sumOfPheromoneVals;
            // console.log('sumOfPheromoneVals', sumOfPheromoneVals);
            const r = random(100); 
            if (r <= range) {
                choosenPheromone = currP;
                break;
            }
        }

        const index = (this.startNode.id === choosenPheromone.i) ? choosenPheromone.j : choosenPheromone.i;
        const nextNode =  graph.getNodeById(index);
        this.backTrackPath.push(this.startNode.id);
        return nextNode;
    }


    chooseNextDestinationNode() {
        if (this.arrivedAtSourceOfFood) {
            return this.getPreviousNodeToHome();
        }

        const neighboursIds = Object.keys(this.startNode.neighbours).filter(nId => !(nId in this.nodesVisited));

        if (this.isSomeNeighbourFood(neighboursIds)) {
            console.log('FOUNDED FOOD!')
            this.arrivedAtSourceOfFood = true;
            this.backTrackPath.push(this.startNode.id);
            return this.sourceOfFoodNode;
        }


        if (neighboursIds.length > 0) {
            return this.chooseByPheromones(neighboursIds);
        } 

        return this.getPreviousNodeFromBackTrack();
    }

    resetAnt() {
        this.startNode = this.destinationNode;
        this.arrivedAtSourceOfFood = false;
        this.backTrackPath = [];
        this.nodesVisited = {};
        this.nodesVisited[this.homeNode] = true;
        const nextNode = this.chooseNextDestinationNode();
        this.setDestinationByNode(nextNode);
    }

    printAnt() {
        let res = {}; 
        res["backtrack"] = this.backTrackPath.toString();
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
    /**
     * TODO! Arrreglar bug de backtrack
     * TODO: Elegir método de elegir entre nodos por pheromonas
     * 
     */
    constructor(graph) {
        this.graph = graph;
        this.ants = [];
        // const initialNode = random(graph.nodes)
        const initialNode = graph.nodes[2];
        const sourceOfFoodNode = graph.nodes[19]; 
        const NUMBER_OF_ANTS = 1; 

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