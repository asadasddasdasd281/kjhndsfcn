import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PlusCircle } from "lucide-react";

const sessionSchema = z.object({
  productNumber: z.string().min(1, "Product number is required"),
});

type SessionFormData = z.infer<typeof sessionSchema>;

export default function SessionInit() {
  const [, params] = useRoute("/session/:productNumber/init");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      productNumber: params?.productNumber || "",
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: SessionFormData) => {
      const response = await apiRequest("POST", "/api/sessions", data);
      return response.json();
    },
    onSuccess: (session) => {
      toast({
        title: "Session Created",
        description: `Session ${session.productNumber} has been initialized successfully.`,
      });
      setLocation(`/session/${session.productNumber}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SessionFormData) => {
    createSessionMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md mx-auto px-4">
        <Card>
          <CardContent className="pt-6 p-8">
            <div className="text-center mb-8">
              <PlusCircle className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Start New Session</h2>
              <p className="text-gray-600">Enter a Product Number to initialize your authentication session</p>
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
                          disabled={createSessionMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createSessionMutation.isPending}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {createSessionMutation.isPending ? "Initializing..." : "Initialize Session"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
