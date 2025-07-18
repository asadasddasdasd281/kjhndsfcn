import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, X } from "lucide-react";

interface LabelingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: string, subcategories: string[]) => void;
}

interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

export default function LabelingModal({ isOpen, onClose, onSave }: LabelingModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategories([]);
  };

  const handleSubcategoryToggle = (subcategory: string) => {
    setSelectedSubcategories(prev => {
      if (prev.includes(subcategory)) {
        return prev.filter(s => s !== subcategory);
      } else {
        return [...prev, subcategory];
      }
    });
  };

  const handleSave = () => {
    if (selectedCategory && selectedSubcategories.length > 0) {
      const category = categories?.find((c: Category) => c.id === selectedCategory);
      onSave(category?.name || selectedCategory, selectedSubcategories);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedCategory("");
    setSelectedSubcategories([]);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  const selectedCategoryData = categories?.find((c: Category) => c.id === selectedCategory);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Label This Region</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Category Selection */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Select Category</h4>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categories?.map((category: Category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    className="p-4 h-auto text-left justify-start"
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {category.subcategories.length} options
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Subcategory Selection */}
          {selectedCategoryData && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Select Specific Issues
                {selectedSubcategories.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedSubcategories.length} selected
                  </Badge>
                )}
              </h4>
              <ScrollArea className="max-h-48 border rounded-md p-4">
                <div className="space-y-2">
                  {selectedCategoryData.subcategories.map((subcategory: string) => (
                    <div key={subcategory} className="flex items-center space-x-2">
                      <Checkbox
                        id={subcategory}
                        checked={selectedSubcategories.includes(subcategory)}
                        onCheckedChange={() => handleSubcategoryToggle(subcategory)}
                      />
                      <label 
                        htmlFor={subcategory}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {subcategory}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!selectedCategory || selectedSubcategories.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Label
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
