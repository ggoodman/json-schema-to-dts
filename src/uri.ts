import { URL } from 'url';

export function uriAppendFragmentPath(uri: string, fragment: string) {
  try {
    const url = new URL(uri);

    url.hash = `${url.hash}/${fragment}`;

    return url.href;
  } catch (err) {
    console.log(uri, fragment);
    throw err;
  }
}

export function uriRelative(uri: string, path: string) {
  const url = new URL(path, uri);

  return url.href;
}
