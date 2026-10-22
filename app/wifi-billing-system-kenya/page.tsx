import SolutionPage, { solutionMetadata } from '../solutions/SolutionPage';

// Lists live blog guides, so it revalidates with the blog.
export const revalidate = 3600;

export const metadata = solutionMetadata('/wifi-billing-system-kenya');

export default function Page() {
  return <SolutionPage path="/wifi-billing-system-kenya" />;
}
