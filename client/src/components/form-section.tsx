
import React from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormSectionProps {
  title: string;
  section: string;
  data: Record<string, any>;
  warehouses: Array<{ id: string; name: string; }>;
  onSave: (section: string, fields: Record<string, any>) => void;
  isCompleted: boolean;
  isLoading: boolean;
  session?: { productNumber: string; id: number; };
}

export default function FormSection({
  title,
  section,
  data,
  warehouses,
  onSave,
  isCompleted,
  isLoading,
  session,
}: FormSectionProps) {
  const { toast } = useToast();
  const getFieldsForSection = (sectionName: string) => {
    switch (sectionName) {
      case "product_info":
        return [
          { name: "date", label: "Date", type: "date", defaultValue: new Date().toISOString().split('T')[0] },
          { name: "orderNumber", label: "Order #", type: "text", defaultValue: "" },
          { name: "productNumber", label: "PN #", type: "text", defaultValue: "" },
          { name: "model", label: "Model", type: "text", defaultValue: "" },
          { name: "authDuration", label: "Auth Duration (seconds)", type: "number", defaultValue: "" },
          { name: "authenticator", label: "Authenticator", type: "text", defaultValue: "" },
          { name: "employeeId", label: "Employee ID", type: "text", defaultValue: "" },
          { name: "warehouse", label: "Initial Auth Warehouse", type: "select", options: warehouses, defaultValue: "" },
          { name: "doubleConfirmed", label: "Was Product Double Confirmed?", type: "checkbox", defaultValue: false },
        ];
      case "auth1":
      case "auth2":
      case "regional":
        return [
          { name: "authenticator", label: section === "regional" ? "Trainer" : "Authenticator", type: "text", defaultValue: "" },
          { name: "facility", label: "Facility", type: "select", options: warehouses, defaultValue: "" },
          { name: "verdict", label: "Verdict", type: "select", options: [
            { id: "real", name: "Real" },
            { id: "fake", name: "Fake" }
          ], defaultValue: "" },
          { name: "reason", label: "Reason", type: "textarea", defaultValue: "" },
        ];
      case "feedback":
        return [
          { name: "feedbackNotes", label: "Feedback Notes", type: "textarea", defaultValue: "" },
          { name: "conversationDate", label: "Date of Conversation", type: "date", defaultValue: "" },
          { name: "withinCAPS", label: "Within CAPS?", type: "select", options: [
            { id: "true", name: "Yes" },
            { id: "false", name: "No" }
          ], defaultValue: "" },
          { name: "verdictAfterReview", label: "Verdict After Review", type: "select", options: [
            { id: "real", name: "Real" },
            { id: "fake", name: "Fake" }
          ], defaultValue: "" },
          { name: "additionalNotes", label: "Additional Notes/Feedback", type: "textarea", defaultValue: "" },
        ];
      default:
        return [];
    }
  };

  // Prepare default values with session data preloaded
  const getDefaultValues = () => {
    const defaults: Record<string, any> = {};
    const fields = getFieldsForSection(section);
    
    // Set default values for all fields
    fields.forEach(field => {
      defaults[field.name] = data?.[field.name] ?? field.defaultValue ?? (field.type === "checkbox" ? false : "");
    });
    
    // Preload product number from session for product_info section
    if (section === "product_info" && session?.productNumber) {
      defaults.productNumber = data?.productNumber || session.productNumber;
    }
    
    return defaults;
  };

  const validateAllFieldsFilled = (formData: Record<string, any>) => {
    const fields = getFieldsForSection(section);
    const emptyFields = [];
    
    for (const field of fields) {
      const value = formData[field.name];
      
      // Check if field is empty based on its type
      if (field.type === "checkbox") {
        // Checkboxes can be false (unchecked) - this is valid
        continue;
      } else if (value === null || value === undefined || value === "") {
        emptyFields.push(field.label);
      }
    }
    
    return emptyFields;
  };

  const form = useForm({
    defaultValues: getDefaultValues(),
  });

  // Watch form values for real-time validation
  const watchedValues = form.watch();
  const emptyFields = validateAllFieldsFilled(watchedValues);
  const isFormValid = emptyFields.length === 0;

  // Reset form when data or session changes
  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [data, session, form]);

  const handleSubmit = (formData: Record<string, any>) => {
    console.log('Submitting form data:', { section, formData });
    
    // Validate all required fields are filled
    const emptyFields = validateAllFieldsFilled(formData);
    
    if (emptyFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill out all required fields: ${emptyFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    onSave(section, formData);
  };

  const fields = getFieldsForSection(section);

  return (
    <Card className={`form-section ${isCompleted ? "completed" : ""} pl-8`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <Badge variant={isCompleted ? "default" : "secondary"}>
            {isCompleted ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </>
            )}
          </Badge>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fields.map((field) => {
                const fieldId = `${section}-${field.name}`;
                return (
                  <FormField
                    key={field.name}
                    control={form.control}
                    name={field.name}
                    render={({ field: formField }) => (
                      <FormItem className={field.type === "textarea" ? "md:col-span-2" : ""}>
                        <FormLabel htmlFor={fieldId}>
                          {field.label}
                          {field.type !== "checkbox" && <span className="text-red-500 ml-1">*</span>}
                        </FormLabel>
                        <FormControl>
                          {(() => {
                            switch (field.type) {
                              case "text":
                                return (
                                  <Input 
                                    id={fieldId}
                                    name={field.name}
                                    value={formField.value ?? ''}
                                    onChange={(e) => formField.onChange(e.target.value)}
                                  />
                                );
                              case "number":
                                return (
                                  <Input 
                                    id={fieldId}
                                    name={field.name}
                                    type="number" 
                                    value={formField.value ?? ''}
                                    onChange={(e) => formField.onChange(e.target.value)}
                                  />
                                );
                              case "date":
                                return (
                                  <Input 
                                    id={fieldId}
                                    name={field.name}
                                    type="date" 
                                    value={formField.value ?? ''}
                                    onChange={(e) => formField.onChange(e.target.value)}
                                  />
                                );
                              case "textarea":
                                return (
                                  <Textarea 
                                    id={fieldId}
                                    name={field.name}
                                    value={formField.value ?? ''}
                                    onChange={(e) => formField.onChange(e.target.value)}
                                    rows={4}
                                  />
                                );
                              case "select":
                                return (
                                  <Select 
                                    name={field.name}
                                    onValueChange={formField.onChange} 
                                    value={formField.value ?? ''}
                                  >
                                    <SelectTrigger id={fieldId}>
                                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {field.options?.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                          {option.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              case "checkbox":
                                return (
                                  <Checkbox 
                                    id={fieldId}
                                    name={field.name}
                                    checked={formField.value ?? false}
                                    onCheckedChange={formField.onChange}
                                  />
                                );
                              default:
                                return (
                                  <Input 
                                    id={fieldId}
                                    name={field.name}
                                    {...formField} 
                                    value={formField.value || ''}
                                    onChange={(e) => formField.onChange(e.target.value)}
                                    placeholder="Unknown field type"
                                  />
                                );
                            }
                          })()}
                        </FormControl>
                      </FormItem>
                    )}
                  />
                );
              })}
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !isFormValid}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Saving..." : isFormValid ? "Save Section" : `Missing ${emptyFields.length} field${emptyFields.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
