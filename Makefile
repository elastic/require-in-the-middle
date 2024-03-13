SHELL=/bin/bash

# Some targets depend on https://github/trentm/json being on the PATH.
JSON ?= json

.PHONY: all
all:
	npm install

.PHONY: test
test:
	npm test

.PHONY: check
check:
	npm run test:lint

# Ensure CHANGELOG.md and package.json have the same version for a release.
.PHONY: check-version
check-version:
	@echo version is: $(shell cat package.json | json version)
	[[ v`cat package.json | $(JSON) version` == `grep '^## ' CHANGELOG.md | head -1 | tail -1 | awk '{print $$2}'` ]]

# Tag and release a new release based on the current package.json#version.
# This long bit of Makefile does the following:
# - ensure the repo isn't dirty (changed files)
# - warn if we have a tag for this release already
# - interactively confirm
# - git tag
# - npm publish
.PHONY: cutarelease
cutarelease: check
	[[ -z `git status --short` ]]  # If this fails, the working dir is dirty.
	@which $(JSON) 2>/dev/null 1>/dev/null && \
	    ver=$(shell $(JSON) -f package.json version) && \
	    name=$(shell $(JSON) -f package.json name) && \
	    publishedVer=$(shell npm view -j $(shell $(JSON) -f package.json name) time 2>/dev/null | $(JSON) -D/ $(shell $(JSON) -f package.json version)) && \
	    if [[ -n "$$publishedVer" ]]; then \
		echo "error: $$name@$$ver is already published to npm"; \
		exit 1; \
	    fi && \
	    echo "** Are you sure you want to tag and publish $$name@$$ver to npm?" && \
	    echo "** Enter to continue, Ctrl+C to abort." && \
	    read
	ver=$(shell cat package.json | $(JSON) version) && \
	    date=$(shell date -u "+%Y-%m-%d") && \
	    git tag -a "v$$ver" -m "version $$ver ($$date)" && \
	    git push origin "v$$ver" && \
	    npm publish
