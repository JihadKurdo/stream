import * as THREE from "three"

let w = window.innerWidth
let h = window.innerHeight

const renderer = new THREE.WebGLRenderer({
    antialias: true
})
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

renderer.setSize(w, h)
document.body.appendChild(renderer.domElement)

const fov = 90
const aspect = w / h
const near = .1
const far = 100

const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
camera.position.z = 2.5
camera.position.y = 2
camera.rotation.x = Math.PI / -3.5

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x214a5b) // Sky blue

const light = new THREE.DirectionalLight(0xfff8dc, 3)
light.position.set(1, 1, .5)
light.castShadow = true
scene.add(light)

light.shadow.mapSize.width = 512 * 5
light.shadow.mapSize.height = 512 * 5
light.shadow.camera.near = .1
light.shadow.camera.far = 500

const light2 = new THREE.DirectionalLight(0xfff8dc, 1)
light2.position.set(-1, 1, 1)
scene.add(light2)

let highscore = localStorage.getItem("highscore") == null ? 1 : localStorage.getItem("highscore")
const highscoreElement = document.querySelector(".highscore .number")
highscoreElement.textContent = highscore

let planes = []

function boxWithText(text) {

    const translucentMaterial = new THREE.MeshStandardMaterial({
        color: 0x77abee,
        transparent: true,
        opacity: .5
    })

    const boxGeometry = new THREE.BoxGeometry(.95, .5, .1)
    const box = new THREE.Mesh(boxGeometry, translucentMaterial)
    box.receiveShadow = true

    const canvas = document.createElement("canvas")
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext("2d")

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = "#fff"
    context.font = "50px Poppins"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText(text, canvas.width / 2, canvas.height / 2)

    const textTexture = new THREE.CanvasTexture(canvas)
    textTexture.needsUpdate = true
    textTexture.encoding = THREE.sRGBEncoding

    const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
    })

    const textPlaneGeometry = new THREE.PlaneGeometry(boxGeometry.parameters.width, boxGeometry.parameters.width)
    const textPlane = new THREE.Mesh(textPlaneGeometry, textMaterial)
    textPlane.position.z = (boxGeometry.parameters.depth + .001) / 2
    textPlane.renderOrder = 1
    textPlane.material.depthWrite = false

    const edges = new THREE.EdgesGeometry(boxGeometry)
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0xaecaee
    })
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial)
    edgeLines.position.copy(box.position)

    const group = new THREE.Group()
    group.add(box)
    group.add(textPlane)
    group.add(edgeLines)

    group.obstacle = true
    group.operator = text.split(" ")[0]
    group.number = text.split(" ")[1]

    return group

}

function getOperatorAndNumber(isFirstRow) {

    let operators = isFirstRow === true ? ["+"] : ["+", "×", "-", "÷", "÷"]

    const randomOperator = operators[Math.floor(Math.random() * operators.length)]

    const operatorMaxValues = {
        "+": 20,
        "×": 2,
        "-": 50,
        "÷": 6
    }

    const max = operatorMaxValues[randomOperator]
    const randomNumber = Math.floor(Math.random() * max) + 1

    return randomOperator + " " + randomNumber

}

let firstRow = true

function createGroundPlane(zPosition) {

    const textureLoader = new THREE.TextureLoader()
    const groundTexture = textureLoader.load("assets/ground.png")
    groundTexture.wrapS = THREE.RepeatWrapping
    groundTexture.wrapT = THREE.RepeatWrapping

    const planeGeometry = new THREE.PlaneGeometry(1, 1)
    const planeMaterial = new THREE.MeshStandardMaterial({
        map: groundTexture,
        side: THREE.DoubleSide
    })

    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.scale.x = 2
    plane.scale.y = 15
    plane.rotation.x = Math.PI / 2
    plane.position.z = zPosition
    plane.castShadow = false
    plane.receiveShadow = true

    groundTexture.repeat.set(plane.scale.x / 1.5, plane.scale.y / 1.5)

    scene.add(plane)

    plane.ground = true
    plane.startZ = zPosition
    plane.endZ = zPosition - plane.scale.y

    const numRows = 3
    const rowSpacing = plane.scale.y / numRows
    const boxOffsetX = .525

    for (let i = 1; i <= numRows; i++) {

        const zOffset = zPosition - i * rowSpacing

        let firstBoxOperator = getOperatorAndNumber(firstRow)
        let secondBoxOperator = getOperatorAndNumber(firstRow)

        firstRow = false

        const box1 = boxWithText(firstBoxOperator)
        const box2 = boxWithText(secondBoxOperator)

        box1.position.set(-boxOffsetX, .25, zOffset + .01)
        box2.position.set(boxOffsetX, .25, zOffset)

        scene.add(box1)
        scene.add(box2)

    }

    return plane

}
planes.push(createGroundPlane(-3))
planes.push(createGroundPlane(-3 - 15))

const boxGeometry = new THREE.BoxGeometry(.25, .25, .25)
const boxMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
})

const box = new THREE.Mesh(boxGeometry, boxMaterial)
box.castShadow = true
box.receiveShadow = false
box.position.y = .1275
box.position.z = 1
scene.add(box)

const edges = new THREE.EdgesGeometry(boxGeometry)
const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x000000
})
const edgeLines = new THREE.LineSegments(edges, edgeMaterial)
edgeLines.position.copy(box.position)
scene.add(edgeLines)

const boxGroup = new THREE.Group()
boxGroup.add(box)
boxGroup.add(edgeLines)
scene.add(boxGroup)

const UI = document.querySelector(".UI")

let holdInterval = null
let currentX = 0

function whileHolding() {

    let side = currentX >= 50 ? "right" : "left"

    if (side === "left") {

        if (boxGroup.position.x <= -0.87) return
        boxGroup.position.x -= 0.02

    }
    else if (side === "right") {

        if (boxGroup.position.x >= 0.87) return
        boxGroup.position.x += 0.02

    }

}

function startHold(e) {

    e.preventDefault()

    if (holdInterval || !UI.classList.contains("play")) return
    holdInterval = setInterval(whileHolding, 10)

}

function endHold() {

    clearInterval(holdInterval)
    holdInterval = null

}

function handleMove(x) {

    currentX = ((x / window.innerWidth) * 100).toFixed(2)

}

const counterElement = document.querySelector(".counter")
var counter = 1

function startGame() {

    UI.classList.add("play")

    if (UI.classList.contains("retry")) {

        UI.classList.remove("retry")

        holdInterval = null
        currentX = 0

        boxGroup.position.z = 0
        boxGroup.position.x = 0
        camera.position.z = 2.5

        const obstaclesToRemove = []

        scene.traverse((child) => {
            if (child.obstacle === true) {
                obstaclesToRemove.push(child)
            }
        })
        
        obstaclesToRemove.forEach((obstacle) => {
            scene.remove(obstacle)
        })

        firstRow = true
        
        planes = []
        planes.push(createGroundPlane(-3))
        planes.push(createGroundPlane(-3 - 15))

    }

}

document.addEventListener("mousedown", (e) => {

    handleMove(e.clientX)
    startHold(e)

    if (!e.target.classList.contains("start-game-button")) return
    startGame()

})

document.addEventListener("mousemove", (e) => {

    if (holdInterval) handleMove(e.clientX)

})
document.addEventListener("mouseup", endHold)

document.addEventListener("touchstart", (e) => {

    handleMove(e.touches[0].clientX)
    startHold(e)

    if (!e.target.classList.contains("start-game-button")) return
    startGame()

}, {passive: false})
document.addEventListener("touchmove", (e) => {

    if (holdInterval) handleMove(e.touches[0].clientX)

}, {passive: false})

document.addEventListener("touchend", endHold)

let lastGlobalHitTime = 0
  
function update(d = 0) {

    requestAnimationFrame(update)

    if (UI.classList.contains("play")) {

        boxGroup.position.z -= .03
        camera.position.z -= .03

        const lightOffset = new THREE.Vector3(1, 1, .5)
        const light2Offset = new THREE.Vector3(-1, 1, 1)
        const targetOffset = new THREE.Vector3(0, 0, 0)
    
        light.position.copy(boxGroup.position).add(lightOffset)
        light.target.position.copy(boxGroup.position).add(targetOffset)
        light.target.updateMatrixWorld()

        light2.position.copy(boxGroup.position).add(light2Offset)
        light2.target.position.copy(boxGroup.position).add(targetOffset)
        light2.target.updateMatrixWorld()

        const currentPlane = planes[0]
        const nextPlane = planes[1]
        const planeLength = currentPlane.scale.y
    
        const thresholdZ = currentPlane.startZ - (planeLength * .25)
    
        if (!nextPlane.added && boxGroup.position.z < thresholdZ) {

            const newZ = planes[planes.length - 1].position.z - 15
            const newPlane = createGroundPlane(newZ)
            planes.push(newPlane)
            nextPlane.added = true

        }
    
        if (boxGroup.position.z < currentPlane.endZ) {

            const oldPlane = planes.shift()
            scene.remove(oldPlane)

        }

        const now = performance.now()

        if (now - lastGlobalHitTime > 1000) {

            const movingBoxBounds = new THREE.Box3().setFromObject(boxGroup)
        
            scene.traverse((child) => {

                if (child.obstacle === true) {

                    const obstacleBounds = new THREE.Box3().setFromObject(child)
        
                    if (movingBoxBounds.intersectsBox(obstacleBounds)) {

                        if (child.operator == "+") {

                            counter += parseInt(child.number)

                        }
                        else if (child.operator == "-") {

                            counter -= parseInt(child.number)

                        }
                        else if (child.operator == "÷") {

                            counter /= parseInt(child.number)

                        }
                        else if (child.operator == "×") {

                            counter *= parseInt(child.number)

                        }

                        counter = parseInt(counter)

                        if (counter > highscore) {

                            highscore = counter
                            localStorage.setItem("highscore", counter)
                            highscoreElement.textContent = counter

                        }
                        else if (counter < 1) {
        
                            UI.classList.remove("play")
                            UI.classList.add("retry")
                            counter = 1
        
                        }

                        counterElement.textContent = counter

                        lastGlobalHitTime = now

                    }

                }

            })

        }

    }

    renderer.render(scene, camera)

}
update()

window.addEventListener("resize", ()=> {

    const w = window.innerWidth
    const h = window.innerHeight

    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    
})