import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <ShieldX className="h-12 w-12 text-[#6a6b6c] mb-4" />
      <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#f7f8f8]">
        Access Denied
      </h1>
      <p className="text-sm text-[#8a8f98] mt-2">
        You don&apos;t have permission to access this resource.
      </p>
      <Link
        href="/"
        className="text-sm text-[#818cf8] hover:text-[#6366f1] transition-[color] duration-150 mt-6"
      >
        &larr; Back to Channels
      </Link>
    </div>
  );
}
