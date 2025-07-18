import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import SessionHeader from "@/components/session-header";
import { useSession } from "@/hooks/use-session";
import { Download, Images, FileText, Clock, CheckCircle } from "lucide-react";
import type { SessionProgress } from "@shared/schema";

export default function Home() {
  const [, params] = useRoute("/session/:productNumber");
  const [, setLocation] = useLocation();
  
  const productNumber = params?.productNumber;

  const { data: session, isLoading: sessionLoading } = useSession(productNumber);
  
  const { data: progress, isLoading: progressLoading } = useQuery<SessionProgress>({
    queryKey: [`/api/sessions/${session?.id}/progress`],
    enabled: !!session?.id,
  });

  // Create session if it doesn't exist (only after loading is complete)
  useEffect(() => {
    if (!sessionLoading && !session && productNumber) {
      // Auto-create session and stay on current page
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNumber })
      }).then(() => {
        // Refetch session data
        window.location.reload();
      });
    }
  }, [session, sessionLoading, productNumber]);

  // Redirect to root if no product number in URL
  useEffect(() => {
    if (!productNumber) {
      setLocation("/");
    }
  }, [productNumber, setLocation]);

  const handleExport = async () => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/sessions/${session.id}/export`);
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${session.productNumber}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-20 w-full mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const getFormFlowStatus = () => {
    if (!progress?.formFlow) {
      return { label: "Not Started", variant: "secondary" as const };
    }
    
    const { productInfoComplete, auth1Complete, auth2Complete, regionalComplete } = progress.formFlow;
    const completedSections = [productInfoComplete, auth1Complete, auth2Complete, regionalComplete].filter(Boolean);
    
    if (completedSections.length === 0) {
      return { label: "Not Started", variant: "secondary" as const };
    } else if (completedSections.length === 4) {
      return { label: "Completed", variant: "default" as const };
    } else {
      return { label: "In Progress", variant: "outline" as const };
    }
  };

  const canExport = (progress?.imageFlow.uploadCount || 0) > 0 || 
                  progress?.formFlow.productInfoComplete || 
                  progress?.formFlow.auth1Complete || 
                  progress?.formFlow.auth2Complete || 
                  progress?.formFlow.regionalComplete;

  return (
    <div className="min-h-screen bg-background">
      <SessionHeader session={session} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Session: {session.productNumber}
                </h2>
                <p className="text-gray-600">Complete both workflows before final export</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Last saved</p>
                  <p className="text-sm font-medium text-gray-900">
                    {session.lastSaved ? new Date(session.lastSaved).toLocaleString() : "Never"}
                  </p>
                </div>
                <Button 
                  onClick={handleExport}
                  disabled={!canExport}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Image Flow Status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Image Labeling Flow</h3>
                <Badge variant={progress?.imageFlow.uploadCount > 0 ? "default" : "secondary"}>
                  {progress?.imageFlow.uploadCount > 0 ? "In Progress" : "Not Started"}
                </Badge>
              </div>
              
              {progressLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <span>{progress?.imageFlow.uploadCount || 0} images uploaded</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Images className="w-4 h-4 text-yellow-600 mr-2" />
                    <span>{progress?.imageFlow.labeledCount || 0} images labeled</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <FileText className="w-4 h-4 text-gray-400 mr-2" />
                    <span>{progress?.imageFlow.annotationCount || 0} annotations saved</span>
                  </div>
                  
                  {progress?.imageFlow.uploadCount > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Labeling Progress</span>
                        <span>{Math.round((progress.imageFlow.labeledCount / progress.imageFlow.uploadCount) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(progress.imageFlow.labeledCount / progress.imageFlow.uploadCount) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={() => setLocation(`/session/${session.productNumber}/images`)}
                className="w-full mt-4"
              >
                <Images className="w-4 h-4 mr-2" />
                Continue Image Labeling
              </Button>
            </CardContent>
          </Card>

          {/* Form Flow Status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Authentication Form</h3>
                <Badge variant={getFormFlowStatus().variant}>
                  {getFormFlowStatus().label}
                </Badge>
              </div>
              
              {progressLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    {progress?.formFlow.productInfoComplete ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    )}
                    <span>Product + Authenticator Info - {progress?.formFlow.productInfoComplete ? "Complete" : "Pending"}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    {progress?.formFlow.auth1Complete ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    )}
                    <span>Authenticator 1 - {progress?.formFlow.auth1Complete ? "Complete" : "Pending"}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    {progress?.formFlow.auth2Complete ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    )}
                    <span>Authenticator 2 - {progress?.formFlow.auth2Complete ? "Complete" : "Pending"}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    {progress?.formFlow.regionalComplete ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    )}
                    <span>Regional Review - {progress?.formFlow.regionalComplete ? "Complete" : "Pending"}</span>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={() => setLocation(`/session/${session.productNumber}/form`)}
                className="w-full mt-4"
              >
                <FileText className="w-4 h-4 mr-2" />
                Continue Form
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
