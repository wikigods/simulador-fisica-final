import p5 from 'p5';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

const projectileMotionSketch = (p) => {
    // --- Simulation State ---
    let cannon, projectile, target, trajectoryMeter;
    let traces = [];
    let time = 0;
    let pixelsPerMeter = 10; // Scale: pixels per meter. This will be adjusted dynamically.
    const GROUND_HEIGHT = 100; // Increased to avoid button/label overlap
    const ROAD_HEIGHT = 40;

    // --- DOM Elements ---
    let initialHeightSlider, initialVelocitySlider, launchAngleSlider,
        gravitySlider, airResistanceSwitch, projectileSelect,
        massSlider, diameterSlider;
    // HTML buttons removed, replaced by canvas buttons

    let canvasButtons = [];

    class CanvasButton {
        constructor(label, xRatio, yOffset, w, h, baseColor, hoverColor, action) {
            this.label = label;
            this.xRatio = xRatio; // 0.0 to 1.0 relative to width
            this.yOffset = yOffset; // Offset from bottom
            this.w = w;
            this.h = h;
            this.baseColor = baseColor;
            this.hoverColor = hoverColor;
            this.action = action;
        }

        getPos() {
            return {
                x: p.width * this.xRatio,
                y: p.height - this.yOffset
            };
        }

        display(mx, my) {
             const pos = this.getPos();
             const isHover = this.checkHover(mx, my);

             p.push();
             p.rectMode(p.CENTER);
             // Button Body
             p.fill(isHover ? this.hoverColor : this.baseColor);
             p.stroke(255);
             p.strokeWeight(2);
             p.rect(pos.x, pos.y, this.w, this.h, 10); // Rounded corners

             // Text
             p.fill(255);
             p.noStroke();
             p.textAlign(p.CENTER, p.CENTER);
             p.textSize(18);
             p.textStyle(p.BOLD);
             p.text(this.label, pos.x, pos.y);
             p.pop();

             return isHover;
        }

        checkHover(mx, my) {
            const pos = this.getPos();
            return (mx > pos.x - this.w/2 && mx < pos.x + this.w/2 &&
                    my > pos.y - this.h/2 && my < pos.y + this.h/2);
        }

        handleClick(mx, my) {
            if (this.checkHover(mx, my)) {
                this.action();
                return true;
            }
            return false;
        }
    }

    // --- Projectile Data ---
    const PROJECTILES = {
        cannonball: { mass: 17.60, diameter: 0.18, initialHeight: 0, initialVelocity: 18, launchAngle: 25 },
        piano:      { mass: 400, diameter: 1.5, initialHeight: 0, initialVelocity: 10, launchAngle: 90 },
        car:        { mass: 1000, diameter: 2.5, initialHeight: 0, initialVelocity: 50, launchAngle: 90 },
        human:      { mass: 70, diameter: 0.7, initialHeight: 0, initialVelocity: 20, launchAngle: 90 }
    };

    // --- Physics Parameters ---
    let initialHeight = 0, initialVelocity = 18, launchAngle = 25;
    let gravity = 9.81, mass = 17.60, diameter = 0.18;
    let airResistanceOn = false;

    // --- Target Interaction ---
    let isDraggingTarget = false;

    class Cannon {
        constructor() {
            this.baseWidth = 80;
            this.baseHeight = 80;
            this.barrelLength = 80;
            // Initial position: centered horizontally (or left?), on the ground.
            // Ground Y is calculated in draw or update.
            this.pos = p.createVector(p.width * 0.15, 0);
            this.isDragging = false;
            this.dragOffsetX = 0;
            this.isAdjustingAngle = false;
        }

        update(angle) {
            // Road is stacked on top of the green ground
            const roadSurfaceY = p.height - GROUND_HEIGHT - ROAD_HEIGHT;
            const roadCenterY = roadSurfaceY + ROAD_HEIGHT / 2;

            this.pos.y = roadCenterY;

            // Handle dragging (Position - currently disabled/fixed)
            if (this.isDragging) {
                this.pos.x = p.constrain(p.mouseX + this.dragOffsetX, this.baseWidth / 2, p.width - this.baseWidth / 2);
            }

            // Update angle
            this.angle = -p.radians(angle);
        }

        display() {
            p.push();
            p.translate(this.pos.x, this.pos.y);

            // Draw Hole (Back/Inside)
            p.noStroke();
            p.fill(50); // Inside dark
            p.ellipse(0, 0, 120, 30);

            // --- Visual Guides (0m Label, Angle Arc) ---
            
            // "0 m" Label on the left
            p.push();
            p.fill(255);
            p.stroke(0);
            p.strokeWeight(1);
            p.rectMode(p.CENTER);
            p.rect(-80, 0, 40, 20, 2); // Box
            p.fill(0);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(12);
            p.text("0 m", -80, 0);
            p.pop();

            // Angle Arc
            const currentDeg = Math.round(Math.abs(p.degrees(this.angle)));
            p.push();
            // Arc
            p.noFill();
            p.stroke(100);
            p.strokeWeight(1);
            // Draw arc from current angle (negative) to 0. 
            // In p5 arc(x,y,w,h,start,stop) draws clockwise.
            // We want from angle (e.g. -90) to 0.
            p.arc(0, 0, 100, 100, this.angle, 0);
            p.pop();
            // -------------------------------------------

            // Crosshair at pivot (Behind cannon?)
            p.stroke(0);
            p.strokeWeight(2);
            p.line(-10, 0, 10, 0);
            p.line(0, -10, 0, 10);

            // Draw Cannon Body - Rotated
            p.push();
            p.rotate(this.angle);

            // Draw the "Red Vase" shape
            p.stroke(0);
            p.strokeWeight(1);
            p.fill(220, 20, 60); // Crimson Red

            // Shape defined pointing RIGHT (0 degrees)
            // Length ~80, Width Base ~50, Width Top ~40
            p.beginShape();
            p.vertex(0, -25); // Base Top
            p.vertex(80, -20); // Muzzle Top
            p.vertex(80, 20);  // Muzzle Bottom
            p.vertex(0, 25);  // Base Bottom
            p.vertex(-10, 0); // Base Center (Back)
            p.endShape(p.CLOSE);

            // Yellow Zig-Zag Decoration at the top (pointing down/back)
            p.fill(255, 215, 0); // Gold
            p.noStroke();
            p.beginShape();
            // Start at Muzzle Top
            p.vertex(80, -20);
            // Zig zags going back and down
            p.vertex(50, -10); // Point 1
            p.vertex(70, 0);   // Valley 1
            p.vertex(50, 10);  // Point 2
            p.vertex(80, 20);  // Muzzle Bottom
            // Close shape at muzzle end
            p.vertex(80, -20);
            p.endShape(p.CLOSE);

            // Muzzle Rim
            p.fill(255, 215, 0);
            p.stroke(0);
            p.strokeWeight(1);
            // Rim rectangle at the end
            p.rect(78, -22, 8, 44, 2);
            p.pop(); // End rotation

            // Draw Hole Rim (Front) to give depth (Cannon emerges from hole)
            p.noFill();
            p.stroke(169, 169, 169);
            p.strokeWeight(4);
            // Bottom half of the ellipse
            p.arc(0, 0, 140, 40, 0, p.PI);

            // Angle Label Box - positioned near the arc on the right (Drawn last to be on top)
            p.push();
            p.translate(60, -10); // Slightly up and right from center

            p.fill(255);
            p.stroke(0);
            p.strokeWeight(1);
            p.rectMode(p.CENTER);
            p.rect(0, 0, 35, 20, 2);

            p.fill(0);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(12);
            p.text(`${currentDeg}°`, 0, 0);
            p.pop();

            p.pop();
        }

        getBarrelEnd() {
            const x = this.pos.x + this.barrelLength * p.cos(this.angle);
            const y = this.pos.y + this.barrelLength * p.sin(this.angle);
            return p.createVector(x, y);
        }

        checkHover(mx, my) {
             return (mx > this.pos.x - 60 && mx < this.pos.x + 60 &&
                     my > this.pos.y - 60 && my < this.pos.y + 60);
        }
    }

    class Projectile {
        constructor(pos, vel, projectileType, mass, diameter, gravity, airResistance) {
            this.pos = pos;
            this.vel = vel;
            this.acc = p.createVector(0, 0);
            this.type = projectileType;
            this.mass = mass;
            this.diameter = diameter;
            this.gravity = gravity;
            this.airResistance = airResistance;
            this.radius = (diameter / 2) * pixelsPerMeter;
            this.path = [];
            this.inFlight = true;
        }

        applyForce(force) {
            let f = p5.Vector.div(force, this.mass);
            this.acc.add(f);
        }

        update(dt) {
            if (!this.inFlight) return;

            const gForce = p.createVector(0, this.mass * this.gravity);
            this.applyForce(gForce);

            if (this.airResistance) {
                const area = p.PI * (this.diameter / 2) ** 2;
                const densityOfAir = 1.225;
                const dragCoefficient = 0.47;
                const dragMag = 0.5 * densityOfAir * this.vel.magSq() * dragCoefficient * area;
                const dragForce = this.vel.copy().normalize().mult(-dragMag);
                this.applyForce(dragForce);
            }

            this.vel.add(this.acc.copy().mult(dt));
            this.pos.add(this.vel.copy().mult(dt * pixelsPerMeter));
            this.acc.mult(0);

            time += dt;
            this.path.push({ t: time, x: this.pos.x, y: this.pos.y });

            const roadSurfaceY = p.height - GROUND_HEIGHT - ROAD_HEIGHT; // Top of road

            // Projectile lands on the road center line
            const landY = roadSurfaceY + ROAD_HEIGHT / 2;

            // Stop exactly at landY (center of road) to avoid "floating" look
            // We ignore radius for the stop condition to ensure the trajectory line touches the center line.
            // We check only for ground contact to ensure it lands on the flat target, not stopping in mid-air at the target's bounding radius.
            if (this.pos.y > landY) {
                this.pos.y = landY;
                this.inFlight = false;
            }
        }

        display() {
            p.fill(20);
            p.noStroke();
            p.ellipse(this.pos.x, this.pos.y, this.radius * 2);
        }
    }

    class Target {
        constructor(x, y, size) {
            this.pos = p.createVector(x, y);
            this.size = size;
        }

        checkCollision(projectilePos) {
            return p.dist(this.pos.x, this.pos.y, projectilePos.x, projectilePos.y) < this.size / 2;
        }

        handleDragging() {
            const roadCenterY = (p.height - GROUND_HEIGHT - ROAD_HEIGHT) + ROAD_HEIGHT / 2;
            this.pos.y = roadCenterY;

            if (isDraggingTarget) {
                this.pos.x = p.constrain(p.mouseX, this.size/2, p.width - this.size/2);
            }
        }

        display() {
            this.handleDragging();

            const flattenFactor = 0.3; // Flattening for perspective

            p.push();
            p.translate(this.pos.x, this.pos.y);

            // Outer Red Ring
            p.fill(255, 0, 0);
            p.stroke(100, 0, 0);
            p.strokeWeight(2);
            p.ellipse(0, 0, this.size, this.size * flattenFactor);

            // Middle White Ring
            p.fill(255);
            p.noStroke();
            p.ellipse(0, 0, this.size * 0.6, (this.size * 0.6) * flattenFactor);

            // Inner Red Center
            p.fill(255, 0, 0);
            p.ellipse(0, 0, this.size * 0.2, (this.size * 0.2) * flattenFactor);

            p.pop();

            // --- Display Distance ---
            // Draw label below the target in the green area
            const distanceInMeters = (this.pos.x - cannon.pos.x) / pixelsPerMeter;
            p.push();
            // Target Y is at Road Center.
            // Green area starts at Road Center + RoadHeight/2 = Road Bottom.
            // Label needs to be in the Green area.
            // Distance from TargetY to GreenTop is 20px (half road height).
            // Distance from GreenTop to LabelCenter should be ~15px.
            // Total offset = 35px.
            p.translate(this.pos.x, this.pos.y + 40);
            p.fill(255);
            p.stroke(0);
            p.strokeWeight(1);
            p.rectMode(p.CENTER);
            p.rect(0, 0, 60, 25, 5);

            p.fill(0);
            p.noStroke();
            p.textSize(14);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(`${distanceInMeters.toFixed(1)} m`, 0, 1);
            p.pop();
        }
    }

    class TrajectoryMeter {
        constructor(x, y) {
            this.pos = p.createVector(x, y);
            this.size = 20;
            this.isDragging = false;
            this.offsetX = 0;
            this.offsetY = 0;
        }

        handleDragging() {
            if (this.isDragging) {
                this.pos.x = p.mouseX + this.offsetX;
                this.pos.y = p.mouseY + this.offsetY;
            }
        }

        display() {
            this.handleDragging();
            p.push();
            p.stroke(0);
            p.strokeWeight(2);
            p.noFill(); // Transparent
            p.ellipse(this.pos.x, this.pos.y, this.size * 1.5, this.size * 1.5);
            p.line(this.pos.x - this.size, this.pos.y, this.pos.x + this.size, this.pos.y);
            p.line(this.pos.x, this.pos.y - this.size, this.pos.x, this.pos.y + this.size);
            p.pop();
        }

        drawTooltip(point) {
            const landY = (p.height - GROUND_HEIGHT - ROAD_HEIGHT) + ROAD_HEIGHT / 2;

            const range = (point.x - cannon.pos.x) / pixelsPerMeter;
            const height = Math.max(0, (landY - point.y) / pixelsPerMeter);

            // Draw "snapped" indicator on the curve
            p.push();
            p.stroke(0); // Black stroke
            p.strokeWeight(1);
            p.fill(255, 255, 255, 100); // Semi-transparent white
            p.ellipse(point.x, point.y, 15, 15);
            // Crosshair on the point
            p.line(point.x - 10, point.y, point.x + 10, point.y);
            p.line(point.x, point.y - 10, point.x, point.y + 10);
            p.pop();

            const boxWidth = 150;
            const boxHeight = 70;
            const textPadding = 10;

            p.push();
            p.translate(this.pos.x, this.pos.y);
            p.fill(30, 30, 50, 200); // Dark blueish background
            p.noStroke();
            p.rect(15, -boxHeight / 2, boxWidth, boxHeight, 8);

            p.fill(255);
            p.textSize(14);
            p.textAlign(p.LEFT, p.CENTER);

            p.text(`Tiempo:`, 15 + textPadding, -boxHeight / 2 + textPadding * 2);
            p.text(`Distancia:`, 15 + textPadding, -boxHeight / 2 + textPadding * 3.5);
            p.text(`Altura:`, 15 + textPadding, -boxHeight / 2 + textPadding * 5);

            p.textAlign(p.RIGHT, p.CENTER);
            p.text(`${point.t.toFixed(2)} s`, 15 + boxWidth - textPadding, -boxHeight / 2 + textPadding * 2);
            p.text(`${range.toFixed(2)} m`, 15 + boxWidth - textPadding, -boxHeight / 2 + textPadding * 3.5);
            p.text(`${height.toFixed(2)} m`, 15 + boxWidth - textPadding, -boxHeight / 2 + textPadding * 5);
            p.pop();
        }
    }

    function calculateMaxHeight() {
        // Approximate calculation based on launch parameters relative to ground
        // Note: This assumes launch from near ground level for scaling purposes
        const v0y = initialVelocity * p.sin(p.radians(launchAngle));
        const h_max = (v0y ** 2) / (2 * gravity);
        return h_max + 2; // Small buffer
    }

    function calculateFlightTimeAndRange() {
        const v0y = initialVelocity * p.sin(p.radians(launchAngle));
        const v0x = initialVelocity * p.cos(p.radians(launchAngle));

        // Simplified range calculation for ground-to-ground (approx)
        // t = 2 * v0y / g
        const t_flight = (2 * v0y) / gravity;
        const range = v0x * t_flight;

        return { time: t_flight, range: range };
    }

    function updateScale() {
        const groundHeightPixels = GROUND_HEIGHT + ROAD_HEIGHT; // Total non-sky area
        const padding = 1.2;

        const availableHeight = p.height - groundHeightPixels;
        const availableWidth = p.width;

        // Calculate trajectory metrics
        const predictedMaxHeight = calculateMaxHeight();
        const { range: predictedRange } = calculateFlightTimeAndRange();

        // Determine required world units to be visible
        const requiredHeightMeters = Math.max(10, predictedMaxHeight); // Min 10m height
        const requiredWidthMeters = Math.max(10, predictedRange);     // Min 10m range

        // Calculate scale based on height and width constraints
        const ppmHeight = availableHeight / (requiredHeightMeters * padding);
        const ppmWidth = availableWidth / (requiredWidthMeters * padding);

        // Use the more restrictive scale
        pixelsPerMeter = Math.min(ppmHeight, ppmWidth);

        // Clamp pixelsPerMeter to reasonable values to prevent extreme zoom
        pixelsPerMeter = p.constrain(pixelsPerMeter, 2, 50);

        resetSimulation();
    }

    p.setup = () => {
        const canvasContainer = document.getElementById('projectile-motion-canvas');
        const canvas = p.createCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
        canvas.parent('projectile-motion-canvas');

        initialHeightSlider = p.select('#initial-height');
        initialVelocitySlider = p.select('#initial-velocity');
        launchAngleSlider = p.select('#launch-angle');
        gravitySlider = p.select('#proj-gravity-slider');
        airResistanceSwitch = p.select('#air-resistance-switch');
        projectileSelect = p.select('#projectile-select');
        massSlider = p.select('#proj-mass-slider');
        diameterSlider = p.select('#proj-diameter-slider');

        // Initialize Canvas Buttons
        // Position buttons closer to the bottom (30px offset) to avoid overlapping the target label
        // Adjusted positions to accommodate the new PDF button
        canvasButtons.push(new CanvasButton("Descargar PDF", 0.2, 30, 140, 45, p.color(13, 110, 253), p.color(10, 88, 202), downloadPDF));
        canvasButtons.push(new CanvasButton("Reiniciar", 0.5, 30, 140, 45, p.color(108, 117, 125), p.color(90, 98, 104), resetSimulation));
        canvasButtons.push(new CanvasButton("¡Disparar!", 0.8, 30, 140, 45, p.color(220, 53, 69), p.color(200, 35, 51), fireProjectile));


        // Hide Initial Height Slider
        // Use standard DOM API to be safe
        const sliderElement = document.getElementById('initial-height');
        if (sliderElement) {
            // Traverse up to find the container div (likely a .mb-3 div)
            const container = sliderElement.closest('.mb-3');
            if (container) {
                container.style.display = 'none';
            } else {
                // Fallback: hide just the slider and input if container not found
                sliderElement.style.display = 'none';
                const numberInput = document.getElementById('initial-height-input');
                if (numberInput) numberInput.style.display = 'none';
            }
        }


        const controls = [
            // { slider: initialHeightSlider, input: p.select('#initial-height-input'), value: () => initialHeight = parseFloat(initialHeightSlider.value()), label: p.select('#initial-height-value') },
            { slider: initialVelocitySlider, input: p.select('#initial-velocity-input'), value: () => initialVelocity = parseFloat(initialVelocitySlider.value()), label: p.select('#initial-velocity-value') },
            { slider: launchAngleSlider, input: p.select('#launch-angle-input'), value: () => launchAngle = parseFloat(launchAngleSlider.value()), label: p.select('#launch-angle-value') },
            { slider: gravitySlider, input: p.select('#proj-gravity-input'), value: () => gravity = parseFloat(gravitySlider.value()), label: p.select('#proj-gravity-value') },
            { slider: massSlider, input: p.select('#proj-mass-input'), value: () => mass = parseFloat(massSlider.value()), label: p.select('#proj-mass-value') },
            { slider: diameterSlider, input: p.select('#proj-diameter-input'), value: () => diameter = parseFloat(diameterSlider.value()), label: p.select('#proj-diameter-value') }
        ];

        controls.forEach(c => {
            const updateHandler = () => {
                c.value();
                // Update scale if any parameter affecting trajectory height changes
                if (c.slider === initialVelocitySlider || c.slider === launchAngleSlider || c.slider === gravitySlider) {
                    updateScale();
                }
            };

            c.slider.input(() => {
                c.input.value(c.slider.value());
                c.label.html(c.slider.value());
                updateHandler();
            });

            c.input.input(() => {
                let val = parseFloat(c.input.value());
                const min = parseFloat(c.slider.elt.min);
                const max = parseFloat(c.slider.elt.max);
                if (isNaN(val)) return;
                val = p.constrain(val, min, max);
                c.slider.value(val);
                c.label.html(val);
                updateHandler();
            });
        });

        // Set default values matching original design (Screenshot 100)
        // Initial Velocity: 18 m/s
        initialVelocitySlider.value(18);
        p.select('#initial-velocity-input').value(18);
        p.select('#initial-velocity-value').html(18);

        // Launch Angle: 25 degrees
        launchAngleSlider.value(25);
        p.select('#launch-angle-input').value(25);
        p.select('#launch-angle-value').html(25);
        launchAngle = 25;

        // Gravity: 9.81 m/s^2
        gravitySlider.value(9.81);
        p.select('#proj-gravity-input').value(9.81);
        p.select('#proj-gravity-value').html(9.81);
        gravity = 9.81;

        // Mass: 17.60 kg (Cannonball default)
        massSlider.value(17.60);
        p.select('#proj-mass-input').value(17.60);
        p.select('#proj-mass-value').html(17.60);
        mass = 17.60;

        // Diameter: 0.18 m
        diameterSlider.value(0.18);
        p.select('#proj-diameter-input').value(0.18);
        p.select('#proj-diameter-value').html(0.18);
        diameter = 0.18;


        projectileSelect.changed(() => {
            const projectileType = projectileSelect.value();
            const data = PROJECTILES[projectileType];

            // Update physics parameters
            mass = data.mass;
            diameter = data.diameter;
            // initialHeight = data.initialHeight; // Ignored
            initialVelocity = data.initialVelocity;
            launchAngle = data.launchAngle;

            // Update all controls
            controls.forEach(c => {
                let val;
                if (c.slider === massSlider) val = mass;
                else if (c.slider === diameterSlider) val = diameter;
                // else if (c.slider === initialHeightSlider) val = initialHeight;
                else if (c.slider === initialVelocitySlider) val = initialVelocity;
                else if (c.slider === launchAngleSlider) val = launchAngle;

                if (val !== undefined) {
                    c.slider.value(val);
                    c.input.value(val);
                    c.label.html(val);
                }
            });

            updateScale();
        });

        airResistanceSwitch.changed(() => airResistanceOn = airResistanceSwitch.checked());

        cannon = new Cannon();
        target = new Target(p.width * 0.75, p.height - 35, 100); // Increased size to span road
        trajectoryMeter = new TrajectoryMeter(p.width / 2, p.height / 2);
        updateScale(); // Initial setup call
    };

    function downloadPDF() {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(12);
        doc.text("Coeficiente de arrastre: ........................................", 20, 30);

        // Collect all data: existing traces + current projectile if available
        const allData = [...traces];
        if (projectile) {
            allData.push({
                path: projectile.path,
                type: projectile.type,
                mass: projectile.mass,
                diameter: projectile.diameter,
                launchAngle: (p.degrees(p.atan2(-projectile.vel.y, projectile.vel.x))).toFixed(1), // Approximate from initial vel, or better to store it
                // Actually, let's just store the launch config in the projectile object to be safe
                // or just rely on the stored config if we modify the Projectile class to store it (which we did).
                // Wait, I need to make sure I push the *metadata* to traces too.
                // See fireProjectile changes.
                // But for the *current* projectile, I need to reconstruct the metadata from its properties
                // or ensure I stored it.
                // Let's assume fireProjectile and Projectile class now handle this.
                // For the current projectile:
                initialVelocity: initialVelocity, // Approximation if not stored, but better to store.
                // Let's rely on what we have.
                // Better approach: Since I modified Projectile to store mass/diam/gravity/air, I can use those.
                // But I didn't store launchAngle or initialVelocity explicitly in Projectile.
                // I will add them to Projectile in fireProjectile.
                config: projectile.config // I will add this property in fireProjectile
            });
        }

        const tableBody = allData.map(data => {
            const path = data.path;
            if (!path || path.length === 0) return null;

            // Calculate metrics from path
            const startX = path[0].x;
            const startY = path[0].y; // Note: Y is down

            // Max Height (Min Y because Y is down)
            // Height is relative to the start Y (or ground Y).
            // Let's assume start Y is roughly ground.
            let minY = startY;
            let maxX = startX;
            let maxT = 0;

            path.forEach(pt => {
                if (pt.y < minY) minY = pt.y;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.t > maxT) maxT = pt.t;
            });

            const heightPixels = startY - minY;
            const rangePixels = maxX - startX;

            const heightMeters = heightPixels / pixelsPerMeter;
            const rangeMeters = rangePixels / pixelsPerMeter;

            // Use stored config if available (traces), or current projectile props
            const config = data.config || {};

            // Name mapping
            const names = {
                cannonball: "Bala de Cañón",
                piano: "Piano",
                car: "Coche",
                human: "Humano"
            };
            const name = names[config.type] || config.type || "Objeto";

            return [
                name,
                config.diameter.toFixed(2),
                config.mass.toFixed(2),
                config.launchAngle.toFixed(1),
                config.initialVelocity.toFixed(1),
                rangeMeters.toFixed(2),
                heightMeters.toFixed(2),
                maxT.toFixed(2)
            ];
        }).filter(row => row !== null);

        // If no data, maybe add an empty row?
        if (tableBody.length === 0) {
            tableBody.push(["", "", "", "", "", "", "", ""]);
        }

        autoTable(doc, {
            startY: 40,
            head: [['Objetos', 'Diámetro\n(m)', 'Masa\n(Kg)', 'Angulo\n(grados)', 'Velocidad inicial\n(m/s)', 'Alcance\n(m)', 'Altura\n(m)', 'Tiempo\n(s)']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [135, 206, 250], // Light blue
                textColor: 0,
                halign: 'center',
                valign: 'middle',
                lineWidth: 0.1,
                lineColor: [0, 191, 255]
            },
            styles: {
                halign: 'center',
                valign: 'middle',
                lineWidth: 0.1,
                lineColor: [0, 191, 255] // Match the blue border in the image
            },
            columnStyles: {
                0: { cellWidth: 30 },
            }
        });

        // Footer text
        const finalY = doc.lastAutoTable.finalY || 100;
        doc.text("Explicar el porqué de la elección de sus datos.", 20, finalY + 20);

        doc.save("simulacion-proyectiles.pdf");
    }

    function drawTraces() {
        let allPaths = traces.map(t => t.path);
        if (projectile && projectile.path.length > 0) {
            allPaths.push(projectile.path);
        }

        allPaths.forEach(path => {
            // Draw Line
            p.noFill();
            p.stroke(0, 0, 255);
            p.strokeWeight(3);
            p.beginShape();
            path.forEach(pt => p.vertex(pt.x, pt.y));
            p.endShape();

            // Draw Blue Points (every few frames)
            p.fill(0, 0, 255);
            p.noStroke();
            let minY = Infinity;
            let apexPoint = null;

            path.forEach((pt, i) => {
                // Blue dots along path
                if (i % 5 === 0) {
                    p.ellipse(pt.x, pt.y, 4, 4);
                }

                // Track Apex
                if (pt.y < minY) {
                    minY = pt.y;
                    apexPoint = pt;
                }

                // Grey Circles (Time markers) - Every 1.0 second
                const prev = i > 0 ? path[i-1] : null;
                if (prev && Math.floor(pt.t) > Math.floor(prev.t)) {
                    p.push();
                    p.noFill();
                    p.stroke(100);
                    p.strokeWeight(2);
                    p.ellipse(pt.x, pt.y, 10, 10); // Circle
                    p.pop();
                }
            });

            // Draw Green Apex Point
            if (apexPoint) {
                p.fill(0, 255, 0); // Green
                p.noStroke();
                p.ellipse(apexPoint.x, apexPoint.y, 8, 8);
            }
        });
    }

    p.draw = () => {
        // Reset cursor to default, buttons will override if hovered
        p.cursor(p.ARROW);

        drawBackground();

        // Draw static objects first
        drawBackground();

        cannon.update(launchAngle);
        cannon.display();
        target.display();

        // Draw traces AFTER target so the line is visible on impact
        drawTraces();

        // Meter on top
        trajectoryMeter.display();

        // Update and draw the projectile on top.
        if (projectile) {
            projectile.update(p.deltaTime / 1000);
            projectile.display();
        }

        // Handle Cannon Angle Adjustment
        if (cannon.isAdjustingAngle) {
            const dx = p.mouseX - cannon.pos.x;
            const dy = p.mouseY - cannon.pos.y;
            // Calculate angle from horizontal. dy is positive down, so -dy is up.
            let newAngle = p.degrees(p.atan2(-dy, dx));
            // Constrain between 0 and 90 degrees (relaxed from 25)
            newAngle = p.constrain(newAngle, 0, 90);
            
            launchAngle = newAngle;
            launchAngleSlider.value(launchAngle);
            p.select('#launch-angle-input').value(launchAngle.toFixed(0)); // Update input box
            p.select('#launch-angle-value').html(launchAngle.toFixed(0));  // Update label
        }

        // Draw Buttons
        let hoveringButton = false;
        canvasButtons.forEach(btn => {
            if (btn.display(p.mouseX, p.mouseY)) {
                hoveringButton = true;
            }
        });
        if (hoveringButton) p.cursor(p.HAND);
        
        // Cursor feedback for cannon
        if (cannon.checkHover(p.mouseX, p.mouseY) || cannon.isAdjustingAngle) {
            p.cursor('grab');
            if (cannon.isAdjustingAngle) p.cursor('grabbing');
        }


        // Draw the tooltip last so it's on top of everything.
        const allPaths = projectile ? [...traces.map(t => t.path), projectile.path] : [...traces.map(t => t.path)];
        const allPoints = allPaths.flat();

        if (allPoints.length > 0) {
            const { point: closestPoint, dist: minDist } = allPoints.reduce((acc, pt) => {
                const d = p.dist(trajectoryMeter.pos.x, trajectoryMeter.pos.y, pt.x, pt.y);
                return d < acc.dist ? { point: pt, dist: d } : acc;
            }, { point: null, dist: Infinity });

            if (minDist < 30 && closestPoint) { // 30 pixel tolerance
                trajectoryMeter.drawTooltip(closestPoint);
            }
        }
    };

    function drawBackground() {
        p.background(135, 206, 250); // Sky blue

        // Layout: Sky | Road | Green
        const greenTopY = p.height - GROUND_HEIGHT;
        const roadTopY = greenTopY - ROAD_HEIGHT;

        // Green Grass (Bottom)
        p.fill(34, 139, 34); // Green
        p.noStroke();
        p.rect(0, greenTopY, p.width, GROUND_HEIGHT);

        // Road (Above Grass)
        p.fill(80); // Darker Grey
        p.rect(0, roadTopY, p.width, ROAD_HEIGHT);

        // Dashed line
        p.stroke(255, 223, 0); // Yellow
        p.strokeWeight(2);
        const dashLength = 15;
        const dashGap = 10;
        const lineY = roadTopY + ROAD_HEIGHT / 2;
        for (let x = 0; x < p.width; x += dashLength + dashGap) {
            p.line(x, lineY, x + dashLength, lineY);
        }
        p.noStroke(); // Reset stroke
    }

    function fireProjectile() {
        if (projectile && projectile.inFlight) return;

        // Save previous projectile data to traces
        if (projectile) {
            traces.push({
                path: projectile.path,
                config: projectile.config
            });
        }

        time = 0;
        // Launch from the pivot (cannon.pos) to match theoretical physics (0,0) launch.
        // Visually the ball will travel through the barrel.
        const startPos = cannon.pos.copy();
        const angle = p.radians(launchAngle);
        const velocity = p5.Vector.fromAngle(-angle).mult(initialVelocity);

        // Capture launch configuration
        const config = {
            type: projectileSelect.value(),
            mass: mass,
            diameter: diameter,
            initialVelocity: initialVelocity,
            launchAngle: launchAngle,
            gravity: gravity,
            airResistance: airResistanceOn
        };

        projectile = new Projectile(
            startPos,
            velocity,
            config.type,
            config.mass,
            config.diameter,
            config.gravity,
            config.airResistance
        );
        projectile.config = config; // Store config for later retrieval (PDF)
    }

    function resetSimulation() {
        projectile = null;
        traces = [];
        time = 0;
        // Do not reset target or meter position as per user request
    }

    p.mousePressed = () => {
        // Check Buttons first
        let buttonClicked = false;
        canvasButtons.forEach(btn => {
            if (btn.handleClick(p.mouseX, p.mouseY)) {
                buttonClicked = true;
            }
        });
        if (buttonClicked) return;

        // Check Trajectory Meter FIRST (visual top layer)
        if (p.dist(p.mouseX, p.mouseY, trajectoryMeter.pos.x, trajectoryMeter.pos.y) < trajectoryMeter.size / 2) {
            trajectoryMeter.isDragging = true;
            trajectoryMeter.offsetX = trajectoryMeter.pos.x - p.mouseX;
            trajectoryMeter.offsetY = trajectoryMeter.pos.y - p.mouseY;
        } else if (p.dist(p.mouseX, p.mouseY, target.pos.x, target.pos.y) < target.size / 2) {
            isDraggingTarget = true;
        } else if (cannon.checkHover(p.mouseX, p.mouseY)) {
            cannon.isAdjustingAngle = true;
        }
    };

    p.mouseReleased = () => {
        isDraggingTarget = false;
        trajectoryMeter.isDragging = false;
        if (cannon) cannon.isAdjustingAngle = false;
    };

    p.windowResized = () => {
        const canvasContainer = document.getElementById('projectile-motion-canvas');
        if (canvasContainer.offsetWidth !== p.width || canvasContainer.offsetHeight !== p.height) {
            p.resizeCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
            updateScale(); // Recalculate scale and positions based on new canvas size
        }
    };
};

export default projectileMotionSketch;
