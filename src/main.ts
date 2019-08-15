import * as core from '@actions/core';
import jwt from 'jsonwebtoken';
import fs from 'fs';

function generateJWT(key: string, secret: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: key,
    jti: Math.random().toString(),
    iat: issuedAt,
    exp: issuedAt + 60
  };
  return jwt.sign(payload, secret, {
    algorithm: 'HS256'
  });
}

async function sendRequest(path: string, manifest: string, token: string): Promise<any> {
  // read version from manifest
  const manifestJson = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  const version = manifestJson.version;

  // request headers
  const headers = new Headers();
  headers.append('Authorization', `JWT ${token}`);
  headers.append('Content-Type', 'multipart/form-data');

  // addon and version
  const addonBuffer = fs.readFileSync(path);
  const body = new FormData();
  body.append('upload', new Blob([addonBuffer]));
  body.append('version', version);

  // Send request
  const request = new Request('https://addons.mozilla.org/api/v4/addons/', {
    method: 'PUT',
    headers,
    body
  });
  const response = await fetch(request);
  const json = await response.json();
  if (response.status != 201 && response.status != 202) {
    throw new Error(`${response.statusText}: ${json.error}`);
  }
  return json;
}

async function run() {
  try {
    const path = core.getInput('xpi', { required: true });
    const manifest = core.getInput('manifest', { required: true });
    const key = core.getInput('api-key', { required: true });
    const secret = core.getInput('api-secret', { required: true });

    const token = generateJWT(key, secret);
    const response = await sendRequest(path, manifest, token);

    core.debug(`Published version ${response.version}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();