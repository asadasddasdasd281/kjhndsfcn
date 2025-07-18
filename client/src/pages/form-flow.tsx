import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SessionHeader from "@/components/session-header";
import FormSection from "@/components/form-section";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Save, CheckCircle, Clock } from "lucide-react";

export default function FormFlow() {
  const [, params] = useRoute("/session/:productNumber/form");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const productNumber = params?.productNumber!;
  const { data: session, isLoading: sessionLoading } = useSession(productNumber);

  const { data: formData, isLoading: formLoading } = useQuery({
    queryKey: [`/api/sessions/${session?.id}/form`],
    enabled: !!session?.id,
    staleTime: 0,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  const saveFormMutation = useMutation({
    mutationFn: async ({ section, fields }: { section: string; fields: Record<string, any> }) => {
      const response = await apiRequest("POST", `/api/sessions/${session?.id}/form`, {
        section,
        fields,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate form data queries
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${session?.id}/form`] });
      // Invalidate progress queries
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${session?.id}/progress`] });
      // Force refetch form data
      queryClient.refetchQueries({ queryKey: [`/api/sessions/${session?.id}/form`] });
      toast({
        title: "Progress Saved",
        description: "Form data has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save form data",
        variant: "destructive",
      });
    },
  });

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-20 w-full mb-8" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const handleBackToDashboard = () => {
    setLocation(`/session/${productNumber}`);
  };

  const handleSaveSection = (section: string, fields: Record<string, any>) => {
    saveFormMutation.mutate({ section, fields });
  };

  const getFormProgress = () => {
    const sections = ["product_info", "auth1", "auth2", "regional", "feedback"];
    return sections.map(section => ({
      id: section,
      name: getSectionDisplayName(section),
      completed: formData?.[section] && Object.keys(formData[section]).length > 0,
    }));
  };

  const getSectionDisplayName = (section: string) => {
    const names: Record<string, string> = {
      product_info: "Product Info",
      auth1: "Auth 1",
      auth2: "Auth 2",
      regional: "Regional",
      feedback: "Feedback",
    };
    return names[section] || section;
  };

  const progress = getFormProgress();

  return (
    <div className="min-h-screen bg-background">
      <SessionHeader session={session} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={handleBackToDashboard}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-2xl font-semibold text-gray-900">Authentication Form</h2>
          </div>
        </div>

        {/* Form Progress Indicator */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Completion Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {progress.map((section, index) => (
                <div key={section.id} className="text-center">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    section.completed 
                      ? "bg-green-600 text-white" 
                      : "bg-gray-300 text-gray-600"
                  }`}>
                    {section.completed ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{section.name}</p>
                  <p className="text-xs text-gray-500">
                    {section.completed ? "Complete" : "Pending"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {formLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Product + Authenticator Info */}
            <FormSection
              title="Section 1: Product + Authenticator Info"
              section="product_info"
              data={formData?.product_info || {}}
              warehouses={warehouses || []}
              onSave={handleSaveSection}
              isCompleted={!!formData?.product_info}
              isLoading={saveFormMutation.isPending}
              session={session}
            />

            {/* Section 2: Authenticity Confirmation */}
            <FormSection
              title="Section 2: Authenticator #1"
              section="auth1"
              data={formData?.auth1 || {}}
              warehouses={warehouses || []}
              onSave={handleSaveSection}
              isCompleted={!!formData?.auth1}
              isLoading={saveFormMutation.isPending}
              session={session}
            />

            <FormSection
              title="Section 2: Authenticator #2"
              section="auth2"
              data={formData?.auth2 || {}}
              warehouses={warehouses || []}
              onSave={handleSaveSection}
              isCompleted={!!formData?.auth2}
              isLoading={saveFormMutation.isPending}
              session={session}
            />

            <FormSection
              title="Section 2: Regional Confirmation"
              section="regional"
              data={formData?.regional || {}}
              warehouses={warehouses || []}
              onSave={handleSaveSection}
              isCompleted={!!formData?.regional}
              isLoading={saveFormMutation.isPending}
              session={session}
            />

            {/* Section 3: Feedback & Review */}
            <FormSection
              title="Section 3: Feedback & Review"
              section="feedback"
              data={formData?.feedback || {}}
              warehouses={warehouses || []}
              onSave={handleSaveSection}
              isCompleted={!!formData?.feedback}
              isLoading={saveFormMutation.isPending}
              session={session}
            />
          </div>
        )}
      </div>
    </div>
  );
}