import Link from 'next/link';
import { SOLUTION_LINK_LABELS } from './solutions';
import { SOLUTION_PATHS } from './paths';

/**
 * Footer links to the commercial pages. Pages nobody links to rank poorly, and
 * the homepage and every blog post are where this site's link equity sits.
 */
export default function SolutionLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Bitwave solutions" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {SOLUTION_PATHS.map((path) => (
          <li key={path}>
            <Link href={path} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
              {SOLUTION_LINK_LABELS[path]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
