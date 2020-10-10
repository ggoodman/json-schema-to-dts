import { URL } from 'url';

export function uriAppendFragmentPath(uri: string, fragment: string) {
  if (fragment === '#') return uri;

  const url = new URL(uri);

  url.hash = `${url.hash || '#'}/${fragment}`;

  return url.href;
}

export function uriRelative(uri: string, path: string) {
  if (path === '#') {
    return uri;
  }

  // Normalize by stripping off trailing '#'
  if (path.endsWith('#')) {
    path = path.slice(0, -1);
  }

  const url = new URL(path, uri);

  return url.href;
}
