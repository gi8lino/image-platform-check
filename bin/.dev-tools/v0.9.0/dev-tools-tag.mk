# Shared semantic-version tagging targets for dev-tools.
# Upstream: https://github.com/gi8lino/dev-tools
# Version: 0.9.0

VERSION_PREFIX ?= v
DEV_TAG := $(DEV_TOOLS_BIN)/dev-tag

$(DEV_TAG): | $(DEV_TOOLS_BIN)
	$(call download-dev-tool,dev-tag,$@)

##@ Tagging

.PHONY: current
current: $(DEV_TAG) ## Show the current semantic version tag.
	$(call run-tool,$(DEV_TAG),--prefix "$(VERSION_PREFIX)" current)

.PHONY: patch
patch: $(DEV_TAG) ## Create a new patch release tag (x.y.Z+1).
	$(call run-tool,$(DEV_TAG),--prefix "$(VERSION_PREFIX)" patch)

.PHONY: minor
minor: $(DEV_TAG) ## Create a new minor release tag (x.Y+1.0).
	$(call run-tool,$(DEV_TAG),--prefix "$(VERSION_PREFIX)" minor)

.PHONY: major
major: $(DEV_TAG) ## Create a new major release tag (X+1.0.0).
	$(call run-tool,$(DEV_TAG),--prefix "$(VERSION_PREFIX)" major)

.PHONY: push
push: ## Push local tags to the remote repository.
	git push --tags
