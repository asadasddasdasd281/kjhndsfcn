import { useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Upload, Download, FileImage } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useImageLabeling } from "@/hooks/use-image-labeling";
import { queryClient } from "@/lib/queryClient";
import SessionHeader from "@/components/session-header";
import ImageGallery from "@/components/image-gallery";
import ImageLabeling from "@/components/image-labeling";
import LabelingModal from "@/components/labeling-modal";
import type { Image, BoundingBox } from "@shared/schema";

export default function ImageFlow() {
  const [, params] = useRoute("/session/:productNumber/images");
  const [, setLocation] = useLocation();
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isLabelingModalOpen, setIsLabelingModalOpen] = useState(false);

  const productNumber = params?.productNumber!;
  const { data: session, isLoading: sessionLoading } = useSession(productNumber);

  const { data: images, isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: [`/api/sessions/${session?.id}/images`],
    enabled: !!session?.id,
  });

  const {
    currentBoundingBox,
    isDrawing,
    handleImageUpload,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    saveAnnotation,
    clearCurrentBox,
  } = useImageLabeling(session, refetchImages);
    const [showLabelingModal, setShowLabelingModal] = useState(false);
  const [currentImageForLabeling, setCurrentImageForLabeling] = useState<Image | null>(null);
  const [pendingBoundingBox, setPendingBoundingBox] = useState<BoundingBox | null>(null);


  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-20 w-full mb-8" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const handleBackToDashboard = () => {
    setLocation(`/session/${productNumber}`);
    queryClient.invalidateQueries([`/api/session/${productNumber}/progress`]);
  };

  const handleImageSelect = (image: Image) => {
    setSelectedImage(image);
  };

  const handleSaveLabel = async (category: string, subcategories: string[]) => {
    console.log("handleSaveLabel called with:", { category, subcategories });
    console.log("Current bounding box:", currentBoundingBox);
    console.log("Selected image:", selectedImage);

    if (!currentBoundingBox || !selectedImage) {
      console.error("Missing bounding box or selected image");
      return;
    }

    try {
      console.log("Calling saveAnnotation...");
      await saveAnnotation(selectedImage.id, category, subcategories);
      console.log("Save annotation successful, closing modal");
      setIsLabelingModalOpen(false);
      clearCurrentBox();
    } catch (error) {
      console.error("Failed to save annotation:", error);
    }
  };

  const labeledCount = images?.filter(img => img.isLabeled).length || 0;
  const totalCount = images?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <SessionHeader session={session} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={handleBackToDashboard}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-2xl font-semibold text-gray-900">Image Upload & Labeling</h2>
          </div>
          <div className="text-sm text-gray-600">
            {labeledCount} of {totalCount} images labeled
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Gallery Sidebar */}
          <div className="lg:col-span-1">
            <ImageGallery
              images={images || []}
              selectedImage={selectedImage}
              onImageSelect={handleImageSelect}
              onImageUpload={handleImageUpload}
              isLoading={imagesLoading}
            />
          </div>

          {/* Main Labeling Area */}
          <div className="lg:col-span-2">
            {selectedImage ? (
              <ImageLabeling
                image={selectedImage}
                currentBoundingBox={currentBoundingBox}
                isDrawing={isDrawing}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onFinishDrawing={() => setIsLabelingModalOpen(true)}
                onClearAnnotations={clearCurrentBox}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileImage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Image Selected</h3>
                  <p className="text-gray-600">Select an image from the gallery to start labeling</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Labeling Modal */}
        <LabelingModal
          isOpen={isLabelingModalOpen}
          onClose={() => setIsLabelingModalOpen(false)}
          onSave={handleSaveLabel}
        />
      </div>
    </div>
  );
}