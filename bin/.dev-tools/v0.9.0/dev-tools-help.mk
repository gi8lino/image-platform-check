# Shared Make help target for dev-tools.
# Upstream: https://github.com/gi8lino/dev-tools
# Version: 0.9.0

MAKE_HELP := $(DEV_TOOLS_BIN)/make-help

$(MAKE_HELP): | $(DEV_TOOLS_BIN)
	$(call download-dev-tool,make-help,$@)

##@ General

.PHONY: help
help: $(MAKE_HELP) ## Display this help.
	@$(MAKE_HELP) $(MAKEFILE_LIST)
