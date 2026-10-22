import SolutionPage, { solutionMetadata } from '../solutions/SolutionPage';

// Lists live blog guides, so it revalidates with the blog.
export const revalidate = 3600;

export const metadata = solutionMetadata('/mpesa-wifi-billing-kenya');

export default function Page() {
  return <SolutionPage path="/mpesa-wifi-billing-kenya" />;
}
