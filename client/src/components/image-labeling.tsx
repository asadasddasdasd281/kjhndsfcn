import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Square, Eraser, Trash2 } from "lucide-react";
import type { Image, Annotation, BoundingBox } from "@shared/schema";

interface ImageLabelingProps {
  image: Image;
  currentBoundingBox: BoundingBox | null;
  isDrawing: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onFinishDrawing: () => void;
  onClearAnnotations: () => void;
}

export default function ImageLabeling({
  image,
  currentBoundingBox,
  isDrawing,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onFinishDrawing,
  onClearAnnotations,
}: ImageLabelingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { data: annotations, isLoading: annotationsLoading } = useQuery({
    queryKey: [`/api/images/${image.id}/annotations`],
  });

  // Debug log for annotations
  useEffect(() => {
    console.log("Annotations data for image", image.id, ":", annotations);
    console.log("Annotations loading:", annotationsLoading);
  }, [annotations, annotationsLoading, image.id]);

  // Draw annotations and current bounding box on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size to match image with device pixel ratio for sharpness
    const rect = img.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Scale context for high DPI displays
    ctx.scale(dpr, dpr);
    
    // Enable crisp rendering
    ctx.imageSmoothingEnabled = false;

    // Draw existing annotations
    if (annotations) {
      annotations.forEach((annotation: Annotation) => {
        const bbox = annotation.boundingBox as BoundingBox;
        ctx.strokeStyle = "#1976D2";
        ctx.lineWidth = 2;
        ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
        
        // Draw label with better text rendering
        ctx.fillStyle = "#1976D2";
        ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
        const textMetrics = ctx.measureText(annotation.category);
        const paddingX = 8;
        const paddingY = 4;
        const backgroundHeight = 20;
        
        // Ensure background covers text completely
        ctx.fillRect(
          bbox.x, 
          bbox.y - backgroundHeight, 
          Math.max(textMetrics.width + (paddingX * 2), 50), 
          backgroundHeight
        );
        ctx.fillStyle = "white";
        ctx.textBaseline = "top";
        ctx.fillText(annotation.category, bbox.x + paddingX, bbox.y - backgroundHeight + paddingY);
      });
    }

    // Draw current bounding box
    if (currentBoundingBox) {
      ctx.strokeStyle = "#F57C00";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentBoundingBox.x,
        currentBoundingBox.y,
        currentBoundingBox.width,
        currentBoundingBox.height
      );
      ctx.setLineDash([]);
    }
  }, [annotations, currentBoundingBox, imageLoaded]);

  // Trigger finish drawing when bounding box is complete
  useEffect(() => {
    if (currentBoundingBox && !isDrawing && currentBoundingBox.width > 10 && currentBoundingBox.height > 10) {
      onFinishDrawing();
    }
  }, [currentBoundingBox, isDrawing, onFinishDrawing]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    onMouseDown(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      onMouseMove(e);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    onMouseUp(e);
  };

  return (
    <div className="space-y-6">
      {/* Current Image Display */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{image.originalName}</h3>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={onClearAnnotations}
                variant="outline"
                size="sm"
                className="text-gray-600"
              >
                <Eraser className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
          
          {/* Image Canvas Container */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden min-h-96">
            <img 
              ref={imageRef}
              src={`/api/images/${image.id}/file`}
              alt={image.originalName}
              className="w-full h-auto max-h-96 object-contain mx-auto block"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
            />
            
            {imageLoaded && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                style={{
                  left: imageRef.current?.offsetLeft || 0,
                  top: imageRef.current?.offsetTop || 0,
                  width: imageRef.current?.offsetWidth || 0,
                  height: imageRef.current?.offsetHeight || 0,
                }}
              />
            )}
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            Click and drag to draw bounding boxes around areas of interest
          </p>
        </CardContent>
      </Card>

      {/* Current Image Labels */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Image Labels</h3>
          
          {annotationsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !annotations || annotations.length === 0 ? (
            <div className="text-center py-8">
              <Square className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No labels added yet</p>
              <p className="text-sm text-gray-500">Draw bounding boxes to add labels</p>
            </div>
          ) : (
            <div className="space-y-3">
              {annotations.map((annotation: Annotation) => (
                <div key={annotation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-primary rounded-sm"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{annotation.category}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {annotation.subcategories.map((sub, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {sub}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
