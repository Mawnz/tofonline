// Thank you chat gpt <3
export default class KCFTracker {
  targetROI: any = null;
  targetModel: any = null;
  prevFrame: any = null;
  constructor() { }

  // Open cv
  init(grayFrame: any, roi: any) {
    this.targetROI = roi;
    this.targetModel = grayFrame.roi(this.targetROI).clone();
    this.prevFrame = grayFrame.clone();
  }
  // Open cv
  update(grayFrame: any) {
    const response = new (window as any).cv.Mat();
    (window as any).cv.matchTemplate(grayFrame, this.targetModel, response, (window as any).cv.TM_CCOEFF_NORMED);

    const minMaxResult = (window as any).cv.minMaxLoc(response);
    const maxLoc = minMaxResult.maxLoc;

    this.targetROI.x = maxLoc.x;
    this.targetROI.y = maxLoc.y;

    response.delete();

    // Calculate the mean absolute difference (MAD) between the current frame and the previous frame
    const currentROI = grayFrame.roi(this.targetROI).clone();
    const diff = new (window as any).cv.Mat();
    (window as any).cv.absdiff(currentROI, this.prevFrame.roi(this.targetROI), diff);

    const mad = (window as any).cv.mean(diff)[0];

    // Release resources
    currentROI.delete();
    diff.delete();

    // Update the previous frame
    this.prevFrame.delete();
    this.prevFrame = grayFrame.clone();

    return {
      x: this.targetROI.x,
      y: this.targetROI.y,
      width: this.targetROI.width,
      height: this.targetROI.height,
      difference: mad,
    };
  }
}