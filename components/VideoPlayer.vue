<template>
    <div class="text-secondary-light dark:text-secondary-dark">
        <DropZone class="px-5" v-model="data.video" v-if="!data.video"></DropZone>
        <video class="hidden" muted :src="data.video" controls="true"></video>
        <canvas class="hidden"></canvas>
        <div :class="[!data.video ? 'hidden' : '']" class="flex flex-col justify-stretch items-center">
            <fa-icon v-if="data.loading" class="animate-spin text-5xl" :icon="['fa', 'fa-circle-notch']"></fa-icon>
            <canvas class="w-[80%]" id="videoCanvas"></canvas>
            <span>{{ tof.elapsedTime }}</span>
            <div class="flex justify-between w-full px-20 py-5">
                <button v-if="data.video"
                    class="text-secondary-light bg-primary-light dark:text-secondary-dark dark:bg-primary-dark font-bold py-3 px-5 rounded-full float-right"
                    @click="cancel">Cancel</button>
                <button v-if="data.video && !data.setup"
                    class="text-secondary-light bg-primary-light dark:text-secondary-dark dark:bg-primary-dark font-bold py-3 px-5 rounded-full float-right"
                    @click="start">Done</button>
                <button v-if="data.setup && !tof.started"
                    class="text-secondary-light bg-primary-light dark:text-secondary-dark dark:bg-primary-dark font-bold py-3 px-5 rounded-full float-right"
                    @click="tof.started = true">Start routine</button>
            </div>
        </div>
        <div class="flex justify-center" v-if="tof.started">
            <table>
                <thead>
                    <tr>
                        <th class="px-2">Skill</th>
                        <th class="px-2">Time in bed</th>
                        <th class="px-2">Time of flight</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(jump, i) in tof.jumps" :key="i" v-show="tof.currentJump >= i">
                        <td>{{ i + 1 }}</td>
                        <td>{{ Math.round((jump.timeLeave - jump.timeEnter) / 10) / 100 }}s</td>
                        <td>{{ jump.elapsedTime / 1000 }}s</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { fabric } from 'fabric';

const sleep = (ms) => new Promise(resolve => setTimeout(() => resolve(), ms));

//
// data
//
const data = reactive({
    video: '',
    videoEl: null,
    height: 0,
    width: 0,
    canvas: null,
    ctx: null,
    playing: false,
    f: 1,
    rotation: 0,
    rate: 30,
    loading: false,
    setup: false,
    frame: null,
    userInteract: false,
    prevFrame: null
});
//
// Tof related data
//
const tof = reactive({
    currentJump: 0, jumps: Array.from(new Array(10)).map((_, i) => ({
        timeEnter: 0,
        timeLeave: 0,
        elapsedTime: 0
    })), timerActive: false, started: false, ended: false,
    elapsedTime: 0,
    start: 0
});
//
// data related to canvas 
//
const interact = reactive({
    rect: null,
    canvas: null,
    ctx: null,
    stillImg: null
})

//
// computed
//
// elapsed time takes all time in the bed, subtracts that from total time spend from "start" to now
// const elapsedTime = computed(() => Date.now() - tof.jumps[0].timeLeave - tof.jumps.reduce((time, jump) => time + (jump.timeLeave - jump.timeEnter), 0));
//
// Methods
//
async function timerCallback(ts) {
    if(!data.videoEl.ended) {
        computeFrame(ts);
        requestAnimationFrame(timerCallback);
    }
}

async function computeFrame(ts) {
    interact.ctx.drawImage(data.videoEl, 0, 0, interact.canvas.width, interact.canvas.height);
    const frame = interact.ctx.getImageData(
        interact.rect.left,
        interact.rect.top,
        interact.rect.width,
        interact.rect.height
    ).data;

    if (!tof.ended) {
        const moved = checkMovement(frame);

        data.prevFrame = frame;

        if (tof.timerActive) {
            tof.elapsedTime = Math.round(ts - tof.jumps[0].timeLeave - tof.jumps.reduce((time, jump) => time + (jump.timeLeave - jump.timeLeave), 0));
        }

        if (moved && tof.timerActive) {
            tof.timerActive = false;
            tof.jumps[tof.currentJump].elapsedTime = tof.elapsedTime;

            if (!tof.started) {
                tof.elapsedTime = 0;
            } else {
                tof.currentJump += 1;
            }

            tof.jumps[tof.currentJump].timeEnter = ts;

            if (tof.currentJump === 10) {
                tof.ended = true;
            }

            // Acceptable diff is 280ms
        } else if (!moved && !tof.timerActive && !tof.ended) {
            const diff = ts - tof.jumps[tof.currentJump].timeEnter;
            if(diff > 280) {
                tof.timerActive = true;
                tof.jumps[tof.currentJump].timeLeave = ts;
            }
        }
    }
}

function checkMovement(imData) {
    if (!data.prevFrame) {
        return false;
    }

    let movementCount = 0;
    for (let i = 0; i < imData.length; i += 4) {
        const rDiff = Math.abs(imData[i] - data.prevFrame[i]);
        const gDiff = Math.abs(imData[i + 1] - data.prevFrame[i + 1]);
        const bDiff = Math.abs(imData[i + 2] - data.prevFrame[i + 2]);

        if (rDiff + gDiff + bDiff > 350) { // Adjust the threshold for movement sensitivity
            movementCount++;
        }
    }

    if (movementCount > (imData.length / 4) * 0.02) { // Adjust the percentage for enough movement
        return true;
    } else {
        return false;
    }
}

function cancel() {
    data.video = '';
    data.playing = false;
    interact.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
    interact.canvas.height = 0;
}

function start() {
    data.setup = true;
    data.playing = false;
    // remove listeners
    document.querySelector('video').removeEventListener('play', envSetup);
    startStop();
    requestAnimationFrame(timerCallback);
}

function startStop() {
    if (data.playing) {
        data.videoEl.pause();
    } else {
        data.videoEl.play();
    }
    data.playing = !data.playing;
}

async function envSetup() {
    await sleep(50);
    this.pause();
    // prepare first video fram using hidden canvas
    const hiddenCanvas = document.querySelector('canvas.hidden');
    hiddenCanvas.height = interact.canvas.height;
    hiddenCanvas.width = interact.canvas.width;

    const ctx = hiddenCanvas.getContext('2d');

    ctx.drawImage(data.videoEl, 0, 0, interact.canvas.width, interact.canvas.height);

    interact.stillImg = new fabric.Image(hiddenCanvas, {
        top: 0,
        left: 0,
        width: data.width,
        height: data.height,
        objectCaching: false,
        selectable: false
    });

    interact.canvas.add(interact.stillImg);

}

function setupFabric() {
    // save to set later
    const { height, width } = data;

    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = 'yellow';
    fabric.Object.prototype.cornerStyle = 'circle';

    interact.canvas = new fabric.Canvas('videoCanvas', {
        containerClass: 'canvas-container flex w-[80%]'
    });
    interact.canvas.setDimensions({
        width, height
    });

    interact.rect = new fabric.Rect({
        left: data.width / 3,
        top: data.height / 1.3,
        fill: 'rgba(180, 255, 0, 0.5)',
        strokeWidth: '2',
        width: data.width / 3,
        height: data.height / 8,
        objectCaching: false,
        stroke: 'lightgreen',
        strokeWidth: 2,
    })

    interact.canvas.add(interact.rect);
    interact.canvas.setActiveObject(interact.rect);

    interact.ctx = interact.canvas.getContext('2d', {
        willReadFrequently: true
    });
}

//
// Watchers
//
watch(() => data.video, () => {
    data.videoEl = document.querySelector('video');
    // data.canvas = document.querySelector('#videoCanvas');
    // data.ctx = data.canvas.getContext('2d', {
    //     willReadFrequently: true
    // });

    document.querySelector('video').addEventListener('loadedmetadata', function () {
        data.width = this.videoWidth;
        data.height = this.videoHeight;
        data.f = this.videoHeight / this.videoWidth;
        // data.canvas.height = data.canvas.width * data.f;
        this.playbackRate = 1;
        setupFabric();

        sleep(10)
            .finally(() => {
                data.videoEl.play();
            });
    });

    document.querySelector('video').addEventListener('play', envSetup, false);

});

</script>

<style>
tr {
    border-bottom: solid 1px;
}
</style>