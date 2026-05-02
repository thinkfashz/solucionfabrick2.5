import NotFound from '../not-found';

// Lets `/admin/editor` load the same Not-Found UI inside an iframe at a real,
// reachable route (the actual `/[anything-not-found]` returns the 404 page
// with a 404 status, which iframes treat differently across browsers).

export const dynamic = 'force-dynamic';

export default function FourOhFourPreview() {
  return <NotFound />;
}
