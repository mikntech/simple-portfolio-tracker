export function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Full-Stack Monorepo Template</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A modern full-stack application template with pnpm, Nx, tRPC, AWS CDK, Vite, React, and
          Tailwind CSS
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <FeatureCard
          title="Monorepo with Nx"
          description="Efficient monorepo management with Nx for better DX and build performance"
          icon="📦"
        />
        <FeatureCard
          title="Type-Safe API with tRPC"
          description="End-to-end type safety between your React frontend and Node.js backend"
          icon="🔒"
        />
        <FeatureCard
          title="Infrastructure as Code"
          description="AWS CDK for declarative cloud infrastructure management"
          icon="☁️"
        />
        <FeatureCard
          title="Lightning Fast with Vite"
          description="Instant HMR and optimized builds for the best development experience"
          icon="⚡"
        />
        <FeatureCard
          title="Beautiful UI with Tailwind"
          description="Rapidly build modern interfaces with utility-first CSS"
          icon="🎨"
        />
        <FeatureCard
          title="CI/CD with GitHub Actions"
          description="Automated testing, building, and deployment workflows"
          icon="🚀"
        />
      </div>

      <section className="card max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-lg mb-2">1. Install Dependencies</h3>
            <code className="block bg-gray-100 p-3 rounded-md text-sm">pnpm install</code>
          </div>
          <div>
            <h3 className="font-medium text-lg mb-2">2. Start Development</h3>
            <code className="block bg-gray-100 p-3 rounded-md text-sm">pnpm dev</code>
          </div>
          <div>
            <h3 className="font-medium text-lg mb-2">3. Build for Production</h3>
            <code className="block bg-gray-100 p-3 rounded-md text-sm">pnpm build</code>
          </div>
        </div>
      </section>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
