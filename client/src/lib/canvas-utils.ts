export function getCanvasCoordinates(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string = "#1976D2",
  lineWidth: number = 2
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, width, height);
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  backgroundColor: string = "#1976D2",
  textColor: string = "white"
) {
  const metrics = ctx.measureText(text);
  const labelWidth = metrics.width + 10;
  const labelHeight = 20;
  
  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);
  
  // Draw text
  ctx.fillStyle = textColor;
  ctx.font = "12px Inter";
  ctx.fillText(text, x + 5, y - 5);
}

export function clearCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
