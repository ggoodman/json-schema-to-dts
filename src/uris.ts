import { URL } from 'url';

export function resolveRelativeJSONPath(fromUri: string, path: string[]) {
  const fromUrl = new URL(fromUri);

  if (path.length) {
    if (!fromUrl.hash) fromUrl.hash = '#';

    fromUrl.hash += `/${path.join('/')}`;
  }

  const uri = fromUrl.href;

  return uri.endsWith('#') ? uri.slice(0, -1) : uri;
}

export function resolveRelativeUri(fromUri: string, rel: string): string {
  let relUrl: URL;

  try {
    relUrl = new URL(rel);
  } catch {
    relUrl = new URL(rel, fromUri);
  }

  const uri = relUrl.href;

  return uri.endsWith('#') ? uri.slice(0, -1) : uri;
}
