import assert from "node:assert/strict";
import test from "node:test";
import { addedImages, collectImagesFromYaml } from "../dist/images.js";

test("collects Kubernetes image fields", () => {
  const images = collectImagesFromYaml(`
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          image: nextcloud:32.0.0
        - name: redis
          image: redis:8.2
`);
  assert.deepEqual([...images].sort(), ["nextcloud:32.0.0", "redis:8.2"]);
});

test("collects Helm repository and tag image objects", () => {
  const images = collectImagesFromYaml(`
image:
  repository: ghcr.io/example/app
  tag: 1.2.3
`);
  assert.deepEqual([...images], ["ghcr.io/example/app:1.2.3"]);
});

test("collects Kustomize image replacements", () => {
  const images = collectImagesFromYaml(`
images:
  - name: nextcloud
    newName: docker.io/library/nextcloud
    newTag: 32.0.0
`);
  assert.deepEqual([...images], ["docker.io/library/nextcloud:32.0.0"]);
});

test("ignores templated image references", () => {
  const images = collectImagesFromYaml('image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"');
  assert.deepEqual([...images], []);
});

test("returns only newly introduced image references", () => {
  const base = new Set(["nextcloud:31", "redis:8"]);
  const head = new Set(["nextcloud:32", "redis:8"]);
  assert.deepEqual(addedImages(base, head), ["nextcloud:32"]);
});
