class Node {
    constructor(id) {
        this.id = id;
        this.neighbours = {}
        const rx = random(width);
        const ry = random(height);

        this.position = createVector(rx, ry);
    }

    setPosition(newPos) {
        this.position = newPos; 
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

class UniformPoints {
    generateRandomCandidates(n, padding) {
        let candidates = [];
        for (let i = 0; i < n; i++) {
            const cand = createVector(random(padding, width - padding), random(padding, height - padding));
            candidates.push(cand)
        }

        return candidates; 
    }

    getMaxDist(cand, points) {
        const distances = points.map(p => dist(p.x, p.y, cand.x, cand.y));
        return min(distances);
    }

    chooseBestCandidate(candidates, points) {
        let maxDist = -1;
        let bestCand; 

        candidates.forEach(cand => {
            const currDist = this.getMaxDist(cand, points);
            if (currDist > maxDist) {
                maxDist = currDist;
                bestCand = cand;
            }
        })

        return bestCand;
    }

    generateUniformDistributedPoints(numberPoints) {
        const padding = 80;
        const initialP = createVector(random(padding, width - padding), random(padding, height - padding));

        let points = [initialP];

        for (let i = 0; i < numberPoints - 1; i++) {
            const candidates = this.generateRandomCandidates(20, padding);
            const bestCandidate = this.chooseBestCandidate(candidates, points);
            points.push(bestCandidate);
        }

        return points; 
    }
}


class Graph {
    constructor(N) {
        this.nodes = [];
        for (let i = 0; i < N; i++) {
            this.nodes.push(new Node(i))
        }

        this.setNodesUniformPositions();
        this.connectByDistance();
        // this.connectRandomly();
    }

    setNodesUniformPositions() {
        const uniformPoints = new UniformPoints().generateUniformDistributedPoints(this.nodes.length); 
        for (let i = 0; i < uniformPoints.length; i++) {
            const currNode = this.nodes[i];
            currNode.setPosition(uniformPoints[i]);
        }
    }

    getNodeDistances(node) {
        let distances = [];
        for (let i = 0; i < this.nodes.length; i++) {
            const currNode = this.nodes[i];
            distances.push([i, node.position.dist(currNode.position)])
        }

        return distances.sort((a, b) => a[1] - b[1])
    }

    connectThree(node, distances) {
        let tries = 0;
        let connected = 0; 
        let i = 1;

        while (connected < 3 && tries < 2 && i < distances.length) {
            const currDist = distances[i];
            const nodeId = currDist[0];
            const currNode = this.nodes[nodeId];

            if (node.isNeigbour(currNode)) {
                tries++;
            } else {
                node.connect(currNode); 
                connected++;
            }

            i++; 
        }
    }

    connectByDistance() {
        this.nodes.forEach(currNode => {
            const distances = this.getNodeDistances(currNode);
            this.connectThree(currNode, distances)
        })
    }

    connectRandomly() {
        // Conectar aleatoriamente unas 4 veces por nodo.
        this.nodes.forEach(node => {
            for (let i = 0; i < 5; i++) {
                const toss = random();
                if (toss > 0.5) {
                    let nodeChoice = random(this.nodes);
                    while (nodeChoice.id === node.id || node.isNeigbour(nodeChoice)) {
                        nodeChoice = random(this.nodes);
                    }
                    node.connect(nodeChoice)
                }
            }
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

    printGraphTerminal() {
        let res = {nodes: []}; 
        this.nodes.forEach(n => {

            res.nodes.push({
                id: n.id,
                neighbours: Object.keys(n.neighbours),
                position: {x: n.position.x, y: n.position.y}
            })
        })

        console.log(JSON.stringify(res))
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(0);
}

function draw() {
    const graph = new Graph(600);
    graph.display(); 
    graph.printGraphTerminal();
    noLoop();
}