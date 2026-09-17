# Image Platform Check

A GitHub Action and reusable Renovate branch gate that waits to open dependency pull requests until newly referenced container images are actually available for the required OCI platforms.

This solves a common multi-architecture publishing race: a registry tag can exist while one architecture is still being built. Renovate sees the new tag, but `linux/amd64` or another required platform may not be available yet.

## Recommended: Renovate branch gate

Configure Renovate to create its update branch first and wait for branch statuses before opening the pull request:

```json
{
  "prCreation": "status-success"
}
```

Then add this workflow to the repository Renovate updates:

```yaml
---
name: Image platform gate

"on":
  push:
    branches:
      - "renovate/**"
  schedule:
    - cron: "*/15 * * * *"
  workflow_dispatch:

jobs:
  gate:
    permissions:
      contents: read
      statuses: write
    uses: gi8lino/image-platform-check/.github/workflows/gate.yml@v1
    with:
      mode: ${{ github.event_name == 'push' && 'current' || 'all' }}
      platforms: linux/amd64
```

The flow is:

```text
Renovate creates renovate/... branch
              |
              v
     image-platform-check
              |
       +------+------+
       |             |
 linux/amd64     linux/amd64
   missing         available
       |             |
   failure         success
   status           status
       |             |
   no PR yet    Renovate may
                open the PR
```

A scheduled run rechecks every `renovate/**` branch. When an image finishes publishing, the same branch commit status changes from `failure` to `success`; no new commit is required.

### `current` and `all` modes

`current` checks only the Renovate branch that triggered the workflow. Use it for `push` events.

`all` discovers every branch under `renovate/` and rechecks each branch. Use it for scheduled and manual runs.

The default commit status context is `image-platform-check`.

## Example: Nextcloud

Suppose Renovate updates:

```yaml
image: nextcloud:32.0.0
```

and the tag currently contains only:

```text
linux/arm64
linux/arm/v7
```

The Renovate branch receives:

```text
image-platform-check: failure
```

When `linux/amd64` later appears, the scheduled gate updates the same commit to:

```text
image-platform-check: success
```

With Renovate `prCreation: status-success`, the PR is not opened until its branch statuses pass.

## Reusable workflow inputs

### `mode`

`current` or `all`. Default: `current`.

### `platforms`

Required OCI platforms separated by commas, whitespace, or newlines. Default: `linux/amd64`.

```yaml
with:
  platforms: |
    linux/amd64
    linux/arm64
```

Every configured platform must exist.

### `branch-prefix`

Branch prefix used by `all` mode. Default: `renovate/`.

### `file-pattern`

JavaScript regular expression used to select changed files. Default: `\.(?:ya?ml)$`.

### `status-context`

Commit status context written to each Renovate branch commit. Default: `image-platform-check`.

## Standalone action

The underlying checker can also be used directly. Automatic discovery compares `HEAD` against the merge base of `base-ref`:

```yaml
- name: Checkout
  uses: actions/checkout@v6
  with:
    fetch-depth: 0

- name: Verify image platforms
  uses: gi8lino/image-platform-check@v1
  with:
    base-ref: origin/main
    platforms: linux/amd64
```

You can bypass discovery and check explicit images:

```yaml
- uses: gi8lino/image-platform-check@v1
  with:
    images: |
      nextcloud:latest
      redis:8
    platforms: linux/amd64
```

## What it detects

The checker discovers newly introduced image references in changed YAML files. It understands common forms including:

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

## Standalone action inputs

### `platforms`

Required OCI platforms. Default: `linux/amd64`.

### `images`

Optional explicit image references. When provided, changed-file discovery is skipped.

### `base-ref`

Git ref used as the comparison base for automatic discovery. The action computes the merge base with `HEAD`, so it checks only changes introduced by the update branch.

### `file-pattern`

JavaScript regular expression used to select changed files. Default: `\.(?:ya?ml)$`.

## Outputs

| Output    | Description                                         |
| --------- | --------------------------------------------------- |
| `checked` | Number of image references checked                  |
| `failed`  | Number of image references that failed verification |
| `images`  | JSON array of checked image references              |

## Private registries

The checker uses `docker buildx imagetools inspect`, so it honors Docker credentials already configured on the runner. Log in before using the standalone action if needed.

The reusable branch gate is intended primarily for public images. If Renovate branches reference private registries, create a caller-specific workflow that authenticates before invoking the standalone action, or extend the gate for the authentication mechanism you need.

## Permissions

The caller must grant:

```yaml
permissions:
  contents: read
  statuses: write
```

`statuses: write` is required because the gate writes a commit status directly onto the Renovate branch SHA.

## Development

Requirements: Node.js 24 and Docker with Buildx.

```bash
npm install
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
