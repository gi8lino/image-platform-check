.DEFAULT_GOAL := help

## Node.js

NODE ?= node
NPM ?= npm
NPX ?= npx
TSC ?= ./node_modules/.bin/tsc
NODE_MODULES := node_modules/.package-lock.json

## Tool Versions

# renovate: datasource=github-releases depName=gi8lino/dev-tools
DEV_TOOLS_VERSION ?= v0.9.0

## Shared development tools

include bin/dev-tools.mk
include $(call dev-tools-module,tag)
include $(call dev-tools-module,help)


##@ Development

.PHONY: build
build: $(NODE_MODULES) ## Compile TypeScript into dist.
	$(NPM) run build

.PHONY: typecheck
typecheck: $(NODE_MODULES) ## Type-check TypeScript without emitting files.
	$(NPM) run typecheck

.PHONY: test-unit
test-unit: build ## Build the action and run unit tests.
	$(NPM) test

.PHONY: check-dist
check-dist: build ## Verify the committed distribution matches the TypeScript sources.
	git diff --exit-code -- dist

.PHONY: test
test: fmt-check typecheck test-unit check-dist ## Run all checks and tests.

.PHONY: clean
clean: ## Remove local dependencies and generated files.
	rm -rf node_modules dist


##@ Formatting

.PHONY: fmt
fmt: $(NODE_MODULES) ## Format TypeScript, JSON, YAML, and Markdown files.
	$(NPX) prettier --write \
		src \
		tests \
		.github \
		package.json \
		package-lock.json \
		tsconfig.json \
		README.md \
		action.yml

.PHONY: fmt-check
fmt-check: $(NODE_MODULES) ## Check formatting without modifying files.
	$(NPX) prettier --check \
		src \
		tests \
		.github \
		package.json \
		package-lock.json \
		tsconfig.json \
		README.md \
		action.yml


##@ Dependencies

$(NODE_MODULES): package.json
	$(NPM) install --ignore-scripts

.PHONY: download
download: $(NODE_MODULES) dev-tools ## Download all project dependencies.

.PHONY: dev-tools
dev-tools: $(DEV_TAG) $(MAKE_HELP) ## Download the pinned development tools.
