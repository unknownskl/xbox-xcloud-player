import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center text-center">
      <h1 className="mb-4 text-2xl font-bold">Xbox-xCloud-Player Documentation</h1>
      <p className="text-fd-muted-foreground">
        Check out{' '}
        <Link
          href="/docs"
          className="text-fd-foreground font-semibold underline"
        >
          getting started
        </Link>{' '}
        to start using xbox-xcloud-player.
      </p>
    </main>
  );
}
