import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="p-6 max-w-4xl mx-auto text-center">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">Access Denied</h1>
      <p className="text-muted-foreground mb-6">
        You do not have permission to access this resource.
      </p>
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground transition-pastel"
      >
        ← Back to channels
      </Link>
    </main>
  );
}
