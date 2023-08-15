<template>
  <div class="text-secondary-light dark:text-secondary-dark">
    <DropZone class="px-5" v-model="data.video" v-if="!data.video"></DropZone>
    <canvas class="hidden"></canvas>
    <div :class="[!data.video ? 'hidden' : '']" class="flex flex-col justify-stretch items-center">
      <fa-icon v-if="data.loading" class="animate-spin text-5xl" :icon="['fa', 'fa-circle-notch']"></fa-icon>
      <video height="auto" class="invisible" width=100% muted :src="data.video" controls="true"></video>
      <canvas height="auto" width=100% id="setupCanvas"></canvas>
      <canvas height="auto" width=100% id="videoCanvas" class="hidden"></canvas>
      <!-- <canvas height="auto" width=100% id="skeletonCanvas"></canvas> -->
      <video :srcObject="data.srcObject" id="smallVideo" height="auto" width=50% muted></video>
      <span>{{ tof.elapsedTime > 0 ? tof.elapsedTime / 1000 : 0 }}s</span>
      <div class="flex justify-between w-full px-20 py-5">
        <button v-if="data.video"
          class="text-secondary-light bg-primary-light dark:text-secondary-dark dark:bg-primary-dark font-bold py-3 px-5 rounded-full float-right"
          @click="cancel">
          Cancel
        </button>
        <button
          v-if="data.setup" @click="data.debug = !data.debug"
          class="text-secondary-light bg-primary-light dark:text-secondary-dark dark:bg-primary-dark font-bold py-3 px-5 rounded-full float-right"
        >{{ data.debug ? 'Hide' : 'Show' }} skeleton</button>
        <button v-if="data.video && !data.setup"
          class="text-secondary-light bg-primary-light dark:text-secondary-dark dark:bg-primary-dark font-bold py-3 px-5 rounded-full float-right"
          @click="start">
          Done
        </button>
        <button v-if="data.setup && !tof.started"
          class="text-secondary-light bg-primary-light dark:text-secondary-dark dark:bg-primary-dark font-bold py-3 px-5 rounded-full float-right"
          @click="tof.started = true">
          Start routine
        </button> 
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
            <td>
              {{ Math.round((jump.timeLeave - jump.timeEnter) / 10) / 100 }}s
            </td>
            <td>{{ jump.elapsedTime / 1000 }}s</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { fabric } from "fabric";

const sleep = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));

//
// data
//
const data = reactive({
  video: "",
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
  prevFrame: null,
  diff: {
    width: 1, height: 1
  },
  srcObject: null,
  debug: true
});
//
// Tof related data
//
const tof = reactive({
  currentJump: 0,
  jumps: Array.from(new Array(10)).map((_, i) => ({
    timeEnter: 0,
    timeLeave: 0,
    elapsedTime: 0,
  })),
  timerActive: false,
  started: false,
  ended: false,
  elapsedTime: 0,
  start: 0,
});
//
// data related to canvas
//
const interact = reactive({
  rect: null,
  canvas: null,
  ctx: null,
  skeletonCanvas: null,
  skeletonCtx: null,
  trampoline: null,
});

let detector;

// Lifecycle hooks
onMounted(async () => {
  // const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER});
  await window.tf.setBackend('webgl');
  // https://github.com/tensorflow/tfjs-examples/blob/master/react-native/pose-detection/App.tsx
  // https://storage.googleapis.com/tfjs-models/demos/pose-detection/index.html?model=movenet
  // https://www.tensorflow.org/lite/examples/pose_estimation/overview
  detector = await window.poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    // modelType: window.poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
    modelType: window.poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
  });
});

//
// computed
//

//
// Methods
//

// draw skeletn functions
function drawResults(poses, ctx) {
  for (const pose of poses) {
    drawResult(pose, ctx);
  }
}

function drawResult(pose, ctx) {
  if (pose.keypoints != null) {
    drawKeypoints(pose.keypoints, ctx);
    drawSkeleton(pose.keypoints, pose.id, ctx);
  }
}
const COLOR_PALETTE = [
  '#ffffff', '#800000', '#469990', '#e6194b', '#42d4f4', '#fabed4', '#aaffc3',
  '#9a6324', '#000075', '#f58231', '#4363d8', '#ffd8b1', '#dcbeff', '#808000',
  '#ffe119', '#911eb4', '#bfef45', '#f032e6', '#3cb44b', '#a9a9a9'
];
function drawSkeleton(keypoints, poseId, ctx) {
  // Each poseId is mapped to a color in the color palette.
  const color = COLOR_PALETTE[poseId % 20]
  // 'White';
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  window.poseDetection.util.getAdjacentPairs('MoveNet').forEach(([
    i, j
  ]) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];

    // If score is null, just show the keypoint.
    const score1 = kp1.score != null ? kp1.score : 1;
    const score2 = kp2.score != null ? kp2.score : 1;
    const scoreThreshold = 0.4;

    if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  });
}
// draw keypoints on video
function drawKeypoints(keypoints, ctx) {
  const keypointInd =
    window.poseDetection.util.getKeypointIndexBySide('MoveNet');
  ctx.fillStyle = 'Red';
  ctx.strokeStyle = 'White';
  ctx.lineWidth = 2;

  for (const i of keypointInd.middle) {
    drawKeypoint(keypoints[i], ctx);
  }

  ctx.fillStyle = 'Green';
  for (const i of keypointInd.left) {
    drawKeypoint(keypoints[i], ctx);
  }

  ctx.fillStyle = 'Orange';
  for (const i of keypointInd.right) {
    drawKeypoint(keypoints[i], ctx);
  }
}

function drawKeypoint(keypoint, ctx) {
  // If score is null, just show the keypoint.
  const score = keypoint.score != null ? keypoint.score : 1;
  const scoreThreshold = 0.4;

  if (score >= scoreThreshold) {
    const circle = new Path2D();
    circle.arc(keypoint.x, keypoint.y, 2, 0, 2 * Math.PI); // 4 is default radius
    ctx.fill(circle);
    ctx.stroke(circle);
  }
}

// clean up
function cancel() {
  data.video = "";
  data.playing = false;
  interact.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
  interact.canvas.height = 0;
}
// start tracking
function start() {
  data.setup = true;
  data.playing = false;
  // remove listeners
  document.querySelector("video").removeEventListener("play", envSetup);
  tracking();
}

// start or stop video
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
  const hiddenCanvas = document.querySelector("canvas.hidden");
  hiddenCanvas.height = interact.canvas.height;
  hiddenCanvas.width = interact.canvas.width;

  const ctx = hiddenCanvas.getContext("2d");

  ctx.drawImage(
    data.videoEl,
    0,
    0,
    interact.canvas.width,
    interact.canvas.height
  );

  const stillImg = new fabric.Image(hiddenCanvas, {
    top: 0,
    left: 0,
    width: data.width,
    height: data.height,
    objectCaching: false,
    selectable: false,
  });

  interact.canvas.add(stillImg);
}

// set up "region of interest" to track trampoline
function setupROI() {
  // save to set later
  const { height, width } = data;

  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.cornerColor = "yellow";
  fabric.Object.prototype.cornerStyle = "circle";

  interact.canvas = new fabric.Canvas("setupCanvas", {
    containerClass: "canvas-container flex setupCanvasContainer",
  });

  // interact.skeletonCanvas = new fabric.Canvas("skeletonCanvas", {
  //   containerClass: "canvas-container flex",
  // });

  interact.canvas.setDimensions({
    width: width,
    height: height
  });

  // interact.skeletonCanvas.setDimensions({
  //   width: width / 2,
  //   height: height / 2
  // });

  interact.roi = new fabric.Rect({
    left: data.width / 3,
    top: data.height / 1.3,
    fill: "rgba(180, 255, 0, 0.5)",
    strokeWidth: "2",
    width: data.width / 5,
    height: data.height / 3,
    objectCaching: false,
    stroke: "lightgreen",
    strokeWidth: 2,
  });
  interact.canvas.add(interact.roi);
  interact.canvas.setActiveObject(interact.roi);

  interact.ctx = interact.canvas.getContext("2d", {
    willReadFrequently: true,
  });

  // interact.skeletonCtx = interact.skeletonCanvas.getContext("2d", {
  //   willReadFrequently: true,
  // });
}

// Set up tracking MIL and start tracking
async function tracking() {
  const video = document.querySelector("video");
  // calc diff to original video
  data.diff = {
    width: video.videoWidth / data.width,
    height: video.videoHeight / data.height
  }
  video.currentTime = 0;
  video.height = data.height;
  video.width = data.width;

  // Dimensions for our new cropped window
  const dims = {
    height: interact.roi.getScaledHeight() * data.diff.height,
    width: interact.roi.getScaledWidth() * data.diff.width,
    top: interact.roi.top * data.diff.height,
    left: interact.roi.left * data.diff.width
  };

  // Convert the initial region coordinates to OpenCV format
  // const roi = new cv.Rect(
  //   interact.roi.left,
  //   interact.roi.top,
  //   dims.width,
  //   dims.height
  // );

  // Create a new tracker, for trampoline
  // let tracker = new cv.TrackerMIL();
  // let tracker = new KCF();
  // let cap = new cv.VideoCapture(video);
  // let frame = new cv.Mat(data.height, data.width, cv.CV_8UC4);
  // cap.read(frame);

  // Initialize the tracker with the first frame and region of interest
  // let gray = new cv.Mat();
  // cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
  // tracker.init(gray, roi);


  // data.diff.width /= 2;
  // data.diff.height /= 2;

  // Function to perform object tracking on subsequent frames
  // use this for when debuggin later...

  const smallVideo = document.querySelector('#smallVideo');

  const vcanvas = document.querySelector('#videoCanvas');
  vcanvas.height = dims.height;
  vcanvas.width = dims.width;
  vcanvas.style.transform = 'scale(0.5)'

  const vctx = vcanvas.getContext('2d');
  data.srcObject = vcanvas.captureStream();
  interact.canvas.dispose();

  smallVideo.addEventListener('loadedmetadata', function () {
    this.play();
  });

  async function track(ts) {
    // if (!smallVideo.srcObject) {
    //   let stream = vcanvas.captureStream();
    //   smallVideo.srcObject = stream;
    //   smallVideo.play();
    // }
    // Create a new matrix from the frame data
    // cap.read(frame);
    // Create a grayscale image for processing
    // cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);

    // Initialize variables for storing tracking results
    // const area = tracker.update(gray);

    // Perform tracking
    // Draw a rectangle around the tracked object
    // cv.rectangle(
    //   frame,
    //   { x: area.x, y: area.y },
    //   { x: area.x + area.width, y: area.y + area.height },
    //   [255, 0, 0, 255], // BGR color (blue in this case)
    //   2
    // );
    // check movement in ROI ( the trampoline )
    // calcTof(area.difference, ts);
    // Display the frame with the tracking rectangle
    // only do with skeleton for now
    vctx.drawImage(video,
      dims.left,
      dims.top,
      dims.width,
      dims.height,
      0, 0,
      dims.width,
      dims.height
    );
    // interact.skeletonCtx.clearRect(0, 0, canvasDims.width, canvasDims.height);
    if(smallVideo.currentTime > 0) {

      let poses;
      try {
        poses = await detector.estimatePoses(smallVideo, { maxPoses: 1, flipHorizontal: false })
      } catch (e) {
        console.log(e)
        detector.dispose();
        video.pause();
      }
      // TODO use poses here to make magic happen
      makeMagic(poses);
      if (poses && poses.length && data.debug) {
        drawResults(poses, vctx);
        // drawResults(poses, interact.skeletonCtx);
      }
    }
    // cv.imshow("videoCanvas", frame);
    if (!smallVideo.ended) {
      requestAnimationFrame(track);
    }
  }
  video.play();
  video.loop = true;
  requestAnimationFrame(track);
}

function makeMagic(poses) {
  // TODO make the magic magical
}

function calcTof(diff, ts) {
  if (!tof.ended) {
    // If in bed or time in air has passed 1s
    if (tof.timerActive) {
      tof.elapsedTime = Math.round(
        ts -
        tof.jumps[0].timeLeave -
        tof.jumps.reduce(
          (time, jump) => time + (jump.timeLeave - jump.timeEnter),
          0
        )
      );
    }
    const moved = diff > 8;
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
      if (diff > 290) {
        tof.timerActive = true;
        tof.jumps[tof.currentJump].timeLeave = ts;
      }
    }
  }
}

// OpenCV camshift
// currently not used
async function setupOpencv() {
  const video = document.querySelector("video");

  video.currentTime = 0;
  video.width = data.width;
  video.height = data.height;

  // const bgSubtractor = new cv.BackgroundSubtractorMOG2();
  // const bgSubtractor = new KNN();

  const dims = {
    height: interact.roi.getScaledHeight(),
    width: interact.roi.getScaledWidth(),
  };

  let trackWindow = new cv.Rect(
    interact.roi.left,
    interact.roi.top,
    dims.width,
    dims.height
  );

  let cap = new cv.VideoCapture(video);
  let frame = new cv.Mat(data.height, data.width, cv.CV_8UC4);
  cap.read(frame);

  let hsv = new cv.Mat(data.height, data.width, cv.CV_8UC4);

  let roiHist = null;
  let hsvVec = null;
  let dst = null;
  let trackBox = null;
  let termCrit = new cv.TermCriteria(
    cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT,
    10,
    1
  );

  let roi = frame.roi(trackWindow);
  let hsvRoi = new cv.Mat();
  cv.cvtColor(roi, hsvRoi, cv.COLOR_RGBA2RGB);
  cv.cvtColor(hsvRoi, hsvRoi, cv.COLOR_RGB2HSV);
  let mask = new cv.Mat();
  let lowScalar = new cv.Scalar(30, 30, 0);
  let highScalar = new cv.Scalar(180, 180, 180);
  let low = new cv.Mat(hsvRoi.rows, hsvRoi.cols, hsvRoi.type(), lowScalar);
  let high = new cv.Mat(hsvRoi.rows, hsvRoi.cols, hsvRoi.type(), highScalar);

  cv.inRange(hsvRoi, low, high, mask);

  // Calculate histogram of the ROI
  let hsvRoiVec = new cv.MatVector();
  hsvRoiVec.push_back(hsvRoi);
  roiHist = new cv.Mat();
  cv.calcHist(hsvRoiVec, [0], mask, roiHist, [180], [0, 180]);
  cv.normalize(roiHist, roiHist, 0, 255, cv.NORM_MINMAX);

  roi.delete();
  hsvRoi.delete();
  mask.delete();
  low.delete();
  high.delete();
  hsvRoiVec.delete();

  hsvVec = new cv.MatVector();
  hsvVec.push_back(hsv);
  dst = new cv.Mat();
  function processVideo() {
    try {
      if (tof.ended) {
        // Clean up and stop processing
        frame.delete();
        if (trackWindow) trackWindow.delete();
        if (roiHist) roiHist.delete();
        if (hsv) hsv.delete();
        if (hsvVec) hsvVec.delete();
        if (dst) dst.delete();
        if (trackBox) trackBox.delete();
        return;
      }

      // Read the next frame
      cap.read(frame);
      // Convert the frame to HSV
      cv.cvtColor(frame, hsv, cv.COLOR_RGBA2RGB);
      cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
      cv.calcBackProject(hsvVec, [0], roiHist, dst, [0, 180], 1);

      // Apply CamShift to get the new location
      trackBox = new cv.Rect();
      [trackBox, trackWindow] = cv.CamShift(dst, trackWindow, termCrit);
      // if (trackWindow.width < dims.width || trackWindow.width > dims.width) {
      //     trackWindow.width = dims.width;
      // }
      // if (trackWindow.height < dims.height || trackWindow.height > dims.height) {
      //     trackWindow.height = dims.height;
      // }

      // Draw the tracking box on the frame
      // Draw it on image
      let pts = cv.rotatedRectPoints(trackBox);
      cv.line(frame, pts[0], pts[1], [255, 0, 0, 255], 3);
      cv.line(frame, pts[1], pts[2], [255, 0, 0, 255], 3);
      cv.line(frame, pts[2], pts[3], [255, 0, 0, 255], 3);
      cv.line(frame, pts[3], pts[0], [255, 0, 0, 255], 3);

      // Show the frame on the canvas
      cv.imshow("videoCanvas", frame);

      // Schedule the next frame
      if (video.ended) {
        tof.ended = true;
      }
      requestAnimationFrame(processVideo);
    } catch (err) {
      console.error(err);
    }
  }
  video.defaultPlaybackRate = 0.5
  video.play();
  // Start processing the video
  requestAnimationFrame(processVideo);
}

//
// Watchers
//
watch(
  () => data.video,
  () => {
    data.videoEl = document.querySelector("video");

    document
      .querySelector("video")
      .addEventListener("loadedmetadata", function () {
        data.width = this.clientWidth;
        data.height = this.clientHeight;

        data.f = this.clientHeight / this.clientWidth;
        this.playbackRate = 1;
        this.classList.add('hidden');
        setupROI();

        sleep(10).finally(() => {
          data.videoEl.play();
        });
      });

    document.querySelector("video").addEventListener("play", envSetup, false);
  }
);
</script>

<style>
tr {
  border-bottom: solid 1px;
}

.invisible {
  opacity: 0;
}

#skeletonCanvas {
  background-color: lightgray;
}
</style>