import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useLocation } from "wouter";
import { invalidateSessionQueries } from "@/hooks/use-session";
import type { Session } from "@shared/schema";

interface SessionHeaderProps {
  session?: Session;
}

export default function SessionHeader({ session }: SessionHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBackToLanding = () => {
    invalidateSessionQueries(session?.id);
    setLocation("/");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <ArrowLeft className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Fake Order Report App</h1>
              <p className="text-sm text-gray-500">Data Collection & Report Generation</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleBackToLanding}
              className="flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Button>
            {session && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Current Session</p>
                <p className="text-sm font-medium text-gray-900">
                  {session.productNumber}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}