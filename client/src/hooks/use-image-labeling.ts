import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Session, BoundingBox } from "@shared/schema";

export function useImageLabeling(session: Session | undefined, refetchImages: () => void) {
  const [currentBoundingBox, setCurrentBoundingBox] = useState<BoundingBox | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      console.log("Upload mutation triggered with files:", files);
      console.log("Files length:", files?.length);
      console.log("Session ID:", session?.id);
      
      if (!files || files.length === 0) {
        console.error("No files provided to upload mutation");
        throw new Error("No files selected");
      }
      
      if (!session?.id) {
        console.error("No session ID available");
        throw new Error("No session available");
      }
      
      // Validate file types - files is already an array
      const validFiles = files.filter(file => {
        console.log("Checking file:", file.name, file.type, file.size);
        return file.type.startsWith('image/') || file.type === 'application/zip';
      });
      
      console.log("Valid files count:", validFiles.length);
      
      if (validFiles.length === 0) {
        throw new Error("Please select valid image files or zip archives");
      }
      
      const formData = new FormData();
      validFiles.forEach((file, index) => {
        console.log(`Adding file ${index}:`, file.name);
        formData.append("images", file);
      });
      
      console.log("Making upload request to:", `/api/sessions/${session.id}/images`);
      
      const response = await fetch(`/api/sessions/${session.id}/images`, {
        method: "POST",
        body: formData,
      });
      
      console.log("Upload response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Upload failed with error:", errorData);
        throw new Error(errorData.message || "Upload failed");
      }
      
      const result = await response.json();
      console.log("Upload successful:", result);
      return result;
    },
    onSuccess: () => {
      // Invalidate all image queries for this session
      queryClient.invalidateQueries({
        queryKey: [`/api/sessions/${session?.id}/images`]
      });
      refetchImages();
      toast({
        title: "Upload Successful",
        description: "Images have been uploaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    },
  });

  const annotationMutation = useMutation({
    mutationFn: async ({ imageId, category, subcategories }: {
      imageId: number;
      category: string;
      subcategories: string[];
    }) => {
      console.log("Annotation mutation starting with bounding box:", currentBoundingBox);
      if (!currentBoundingBox) {
        console.error("No bounding box available during annotation mutation");
        throw new Error("No bounding box selected");
      }
      
      const response = await apiRequest("POST", "/api/annotations", {
        imageId,
        sessionId: session?.id,
        boundingBox: currentBoundingBox,
        category,
        subcategories,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate all image queries for this session
      queryClient.invalidateQueries({
        queryKey: [`/api/sessions/${session?.id}/images`]
      });
      // Invalidate annotations for this specific image
      queryClient.invalidateQueries({
        queryKey: [`/api/images/${variables.imageId}/annotations`]
      });
      refetchImages();
      toast({
        title: "Label Saved",
        description: "Annotation has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save annotation",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = useCallback(async (files: File[]) => {
    uploadMutation.mutate(files);
  }, [uploadMutation]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setDrawingStart({ x, y });
    setCurrentBoundingBox({ x, y, width: 0, height: 0 });
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingStart) return;
    
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const width = currentX - drawingStart.x;
    const height = currentY - drawingStart.y;
    
    setCurrentBoundingBox({
      x: width < 0 ? currentX : drawingStart.x,
      y: height < 0 ? currentY : drawingStart.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  }, [isDrawing, drawingStart]);

  const handleCanvasMouseUp = useCallback(() => {
    console.log("Mouse up - current bounding box:", currentBoundingBox);
    setIsDrawing(false);
  }, [currentBoundingBox]);

  const saveAnnotation = useCallback(async (imageId: number, category: string, subcategories: string[]) => {
    return new Promise((resolve, reject) => {
      annotationMutation.mutate({ imageId, category, subcategories }, {
        onSuccess: resolve,
        onError: reject
      });
    });
  }, [annotationMutation]);

  const clearCurrentBox = useCallback(() => {
    setCurrentBoundingBox(null);
    setDrawingStart(null);
    setIsDrawing(false);
  }, []);

  return {
    currentBoundingBox,
    isDrawing,
    handleImageUpload,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    saveAnnotation,
    clearCurrentBox,
  };
}
