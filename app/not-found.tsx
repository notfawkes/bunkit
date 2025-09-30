export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h2 className="text-4xl font-bold mb-4">404: Page Not Found</h2>
      <p className="text-lg mb-8">The page you're looking for doesn't exist.</p>
      <a href="/" className="text-blue-500 hover:text-blue-700 underline">
        Return to Home
      </a>
    </div>
  )
}