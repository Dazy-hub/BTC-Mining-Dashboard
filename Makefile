PKG_ID      := btc-dashboard
PKG_VERSION := 1.0.1.0
PLATFORM    ?= aarch64
IMAGE_TAG   := start9/$(PKG_ID)/main:$(PKG_VERSION)

.PHONY: all image git-init pack verify clean install

all: verify

image:
	docker buildx build \
		--tag $(IMAGE_TAG) \
		--platform linux/$(PLATFORM) \
		--output type=docker,dest=image.tar \
		.

git-init:
	@if [ ! -d .git ]; then \
		git init -q && git add -A && git commit -q -m "build" --allow-empty; \
	fi

pack: image git-init
	start-sdk pack

verify: pack
	start-sdk verify s9pk $(PKG_ID).s9pk
	@echo ""
	@echo "✓  Package ready: $(PKG_ID).s9pk"
	@echo "   Sideload via: StartOS UI → System → Sideload Service"

install: verify
	start-sdk --host https://$(START9_HOST) package install $(PKG_ID).s9pk

clean:
	rm -f image.tar $(PKG_ID).s9pk
