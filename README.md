# Image Platform Check

A GitHub Action that prevents pull requests from merging container image updates before the required OCI platform is actually available in the registry.

This is useful for Renovate, Dependabot, GitOps repositories, and manual image updates. A registry may publish a tag before every architecture has finished building; this action checks the manifest rather than only checking whether the tag exists.

## Example

```yaml
name: Verify container images

on:
  pull_request:
    paths:
      - "**/*.yaml"
      - "**/*.yml"

permissions:
  contents: read

jobs:
  verify-images:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Verify image platforms
        uses: gi8lino/image-platform-check@v1
        with:
          platforms: linux/amd64
```

If a pull request changes `nextcloud:31` to `nextcloud:32` while only `linux/arm64` has been published, the job fails. Re-run the job after `linux/amd64` is published and it becomes green without changing the pull request.

## What it detects

The action discovers newly introduced image references in changed YAML files. It understands common forms including:

```yaml
image: nextcloud:32.0.0
```

```yaml
image:
  repository: nextcloud
  tag: 32.0.0
```

and Kustomize image replacements:

```yaml
images:
  - name: nextcloud
    newTag: 32.0.0
```

Templated references such as `{{ .Values.image }}` are ignored because they cannot be resolved reliably from the repository alone.

## Inputs

### `platforms`

Required OCI platforms separated by commas, whitespace, or newlines. Default: `linux/amd64`.

```yaml
with:
  platforms: |
    linux/amd64
    linux/arm64
```

Every configured platform must exist.

### `images`

Optional explicit image references. When set, PR discovery is skipped. This also allows the action to run outside `pull_request` events.

```yaml
with:
  images: |
    nextcloud:latest
    redis:8
  platforms: linux/amd64
```

### `file-pattern`

JavaScript regular expression used to select changed files. Default: `\.(?:ya?ml)$`.

## Outputs

| Output    | Description                                         |
| --------- | --------------------------------------------------- |
| `checked` | Number of image references checked                  |
| `failed`  | Number of image references that failed verification |
| `images`  | JSON array of checked image references              |

## Private registries

The action uses `docker buildx imagetools inspect`, so it honors Docker credentials already configured on the runner. Log in before running the action:

```yaml
- name: Log in to registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- name: Verify image platforms
  uses: gi8lino/image-platform-check@v1
```

No registry credentials are handled by this action itself.

## Recommended branch protection

Make the image-platform job a required status check. Renovate or another bot can then open the pull request immediately, but GitHub will prevent the merge until all required image architectures are available.

## Development

Requirements: Node.js 24 and Docker with Buildx.

```bash
npm ci
npm run typecheck
npm test
npm run build
```

The compiled `dist/` JavaScript is committed because GitHub JavaScript actions execute the packaged JavaScript directly.

## Releasing

Create and push a semantic version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The release workflow verifies the project, creates a GitHub release, and moves the matching major tag (`v1`) to the release.

## License

Licensed under the [Apache License 2.0](./LICENSE).
