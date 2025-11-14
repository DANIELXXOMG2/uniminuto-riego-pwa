import { TriangleAlert } from "lucide-react";

interface AuthErrorBannerProps {
  message: string | null;
}

export function AuthErrorBanner({ message }: AuthErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
      <TriangleAlert className="h-5 w-5 text-red-600 flex-shrink-0" />
      <p className="text-sm text-red-600 text-center flex-1">{message}</p>
    </div>
  );
}
