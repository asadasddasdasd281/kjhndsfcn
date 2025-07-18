import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ShoppingBag, ArrowRight, Image, FileText, Clock, CheckCircle, Search } from "lucide-react";
import type { Session, SessionProgress } from "@shared/schema";

const sessionSchema = z.object({
  productNumber: z.string().min(1, "Product number is required"),
});

type SessionFormData = z.infer<typeof sessionSchema>;

function SessionTableRow({ session, onContinue }: { session: Session; onContinue: () => void }) {
  const { data: progress, isLoading: progressLoading } = useQuery<SessionProgress>({
    queryKey: [`/api/sessions/${session.id}/progress`],
  });

  const getImageFlowStatus = () => {
    if (!progress?.imageFlow || progress.imageFlow.uploadCount === 0) {
      return { label: "Not Started", variant: "secondary" as const };
    }

    if (progress.imageFlow.labeledCount === progress.imageFlow.uploadCount) {
      return { label: "Complete", variant: "default" as const };
    }

    return { label: "In Progress", variant: "outline" as const };
  };

  const getFormFlowStatus = () => {
    if (!progress?.formFlow) {
      return { label: "Not Started", variant: "secondary" as const };
    }

    const { productInfoComplete, auth1Complete, auth2Complete, regionalComplete } = progress.formFlow;
    const completedSections = [productInfoComplete, auth1Complete, auth2Complete, regionalComplete].filter(Boolean);

    if (completedSections.length === 0) {
      return { label: "Not Started", variant: "secondary" as const };
    } else if (completedSections.length === 4) {
      return { label: "Complete", variant: "default" as const };
    } else {
      return { label: "In Progress", variant: "outline" as const };
    }
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4">
        <div className="font-medium text-gray-900">{session.productNumber}</div>
      </td>
      <td className="py-3 px-4">
        <Badge variant={session.status === "active" ? "default" : "secondary"}>
          {session.status}
        </Badge>
      </td>
      <td className="py-3 px-4">
        {progressLoading ? (
          <div className="h-5 bg-gray-200 rounded animate-pulse w-20"></div>
        ) : (
          <div className="flex flex-col space-y-1">
            <Badge variant={getImageFlowStatus().variant} className="text-xs w-fit">
              {getImageFlowStatus().label}
            </Badge>
            <div className="text-xs text-gray-500">
              {progress?.imageFlow.uploadCount || 0} uploaded, {progress?.imageFlow.labeledCount || 0} labeled
            </div>
          </div>
        )}
      </td>
      <td className="py-3 px-4">
        {progressLoading ? (
          <div className="h-5 bg-gray-200 rounded animate-pulse w-20"></div>
        ) : (
          <div className="flex flex-col space-y-1">
            <Badge variant={getFormFlowStatus().variant} className="text-xs w-fit">
              {getFormFlowStatus().label}
            </Badge>
            <div className="text-xs text-gray-500">
              {progress?.formFlow ? 
                `${[progress.formFlow.productInfoComplete, progress.formFlow.auth1Complete, progress.formFlow.auth2Complete, progress.formFlow.regionalComplete].filter(Boolean).length}/4 sections` 
                : "0/4 sections"}
            </div>
          </div>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="text-sm text-gray-600">
          {session.lastSaved ? new Date(session.lastSaved).toLocaleDateString() : "Never"}
        </div>
      </td>
      <td className="py-3 px-4">
        <Button onClick={onContinue} variant="outline" size="sm">
          Continue
        </Button>
      </td>
    </tr>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      productNumber: "",
    },
  });

  // Fetch all sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const response = await fetch("/api/sessions");
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json();
    },
  });

  const onSubmit = (data: SessionFormData) => {
    setLocation(`/session/${data.productNumber}`);
  };

  const filteredSessions = sessions?.filter((session) =>
    session.productNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <ShoppingBag className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Fake Order Report App</h1>
                <p className="text-sm text-gray-500">Data Collection & Report Generation</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Order Report Session Manager
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create and manage order report sessions. Upload images, 
            document issues, and collect comprehensive data for reporting purposes.
          </p>
        </div>



        {/* Session Start Form */}
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 p-8">
            <div className="text-center mb-8">
              <ShoppingBag className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Start Session</h3>
              <p className="text-gray-600">Enter a Product Number to begin your order report session</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="productNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Number (PN#)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder="e.g., AIR-J1-2024-001"
                          className="text-center"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full btn-primary">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Start Session
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Existing Sessions */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Existing Sessions
          </h3>
           {/* Search Bar */}
           <div className="relative max-w-md mx-auto mb-4">
            <Input
              type="text"
              placeholder="Search by Product Number..."
              className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          {sessionsLoading ? (
             <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Product Number
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Status
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Image Flow
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Form Flow
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Last Saved
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Action
                   </th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                 {[1, 2, 3].map((i) => (
                   <tr key={i}>
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                       <div className="h-5 bg-gray-200 rounded animate-pulse w-24"></div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       <div className="h-5 bg-gray-200 rounded animate-pulse w-16"></div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       <div className="h-5 bg-gray-200 rounded animate-pulse w-20"></div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       <div className="h-5 bg-gray-200 rounded animate-pulse w-20"></div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       <div className="h-5 bg-gray-200 rounded animate-pulse w-24"></div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                       <div className="h-5 bg-gray-200 rounded animate-pulse w-16"></div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
          ) : filteredSessions && filteredSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image Flow
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form Flow
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Saved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.map((session) => (
                    <SessionTableRow
                      key={session.id}
                      session={session}
                      onContinue={() => setLocation(`/session/${session.productNumber}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              {sessions && sessions.length > 0 ? (
                <p>No sessions found matching your search.</p>
              ) : (
                <p>No existing sessions found. Start a new session above!</p>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Each session is uniquely identified by its Product Number. You can return to 
            an existing session by entering the same Product Number.
          </p>
        </div>
      </div>
    </div>
  );
}