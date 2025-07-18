import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload, CheckCircle, Clock, FileImage } from "lucide-react";
import type { Image } from "@shared/schema";

interface ImageGalleryProps {
  images: Image[];
  selectedImage: Image | null;
  onImageSelect: (image: Image) => void;
  onImageUpload: (files: File[]) => Promise<void>;
  isLoading: boolean;
}

export default function ImageGallery({ 
  images, 
  selectedImage, 
  onImageSelect, 
  onImageUpload,
  isLoading 
}: ImageGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: onImageUpload,
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File select event triggered");
    const files = e.target.files;
    console.log("Selected files:", files, "Count:", files?.length);
    console.log("Upload pending:", uploadMutation.isPending);
    
    if (files && files.length > 0 && !uploadMutation.isPending) {
      console.log("Converting FileList to array and calling uploadMutation");
      // Convert FileList to array to preserve file objects
      const fileArray = Array.from(files);
      console.log("File array:", fileArray);
      uploadMutation.mutate(fileArray);
      e.target.value = ""; // Reset input
    } else {
      console.log("Upload blocked:", { 
        hasFiles: !!(files && files.length > 0), 
        isPending: uploadMutation.isPending 
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log("Drop event triggered");
    const files = e.dataTransfer.files;
    console.log("Dropped files:", files, "Count:", files?.length);
    console.log("Upload pending:", uploadMutation.isPending);
    
    if (files.length > 0 && !uploadMutation.isPending) {
      console.log("Converting FileList to array and calling uploadMutation");
      // Convert FileList to array to preserve file objects
      const fileArray = Array.from(files);
      console.log("File array:", fileArray);
      uploadMutation.mutate(fileArray);
    } else {
      console.log("Drop upload blocked:", { 
        hasFiles: files.length > 0, 
        isPending: uploadMutation.isPending 
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Images</h3>
          
          <div 
            className={`upload-zone border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              uploadMutation.isPending 
                ? 'border-blue-300 bg-blue-50' 
                : 'border-gray-300 hover:border-primary'
            } ${uploadMutation.isPending ? 'pointer-events-none' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
          >
            <CloudUpload className={`w-8 h-8 mx-auto mb-3 ${
              uploadMutation.isPending ? 'text-blue-400 animate-pulse' : 'text-gray-400'
            }`} />
            <p className="text-gray-600 mb-2">
              {uploadMutation.isPending 
                ? 'Uploading images...'
                : 'Drag & drop images or .zip files'
              }
            </p>
            <Button 
              type="button" 
              variant="link" 
              className="text-primary hover:text-blue-700"
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Browse Files'}
            </Button>
          </div>
          
          <input 
            ref={fileInputRef}
            type="file" 
            multiple 
            accept="image/*,.zip" 
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploadMutation.isPending}
          />
          
          {uploadMutation.isPending && (
            <p className="text-sm text-gray-600 mt-2">Uploading...</p>
          )}
        </CardContent>
      </Card>

      {/* Image Gallery */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Images</h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-2">
                  <Skeleton className="w-12 h-12 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : images.length === 0 ? (
              <div className="text-center py-8">
                <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No images uploaded yet</p>
              </div>
            ) : (
              images.map((image) => (
                <div 
                  key={image.id}
                  className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                    selectedImage?.id === image.id 
                      ? "bg-blue-50 border border-blue-200" 
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => onImageSelect(image)}
                >
                  <img 
                    src={`/api/images/${image.id}/file`}
                    alt={image.originalName}
                    className="w-12 h-12 object-cover rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center hidden">
                    <FileImage className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {image.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {image.annotationCount} labels
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {image.isLabeled ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
