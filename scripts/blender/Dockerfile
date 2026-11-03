# KIW shop-drawing worker (Blender) for Railway — replaces the Mac mini LaunchAgent com.kiw.blender-drawings.
# Outbound HTTPS only: polls the shop app, renders with headless Blender, uploads to a signed URL.
FROM debian:bookworm-slim
ARG BLENDER_VERSION=4.5.13
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl xz-utils python3 \
      libx11-6 libxi6 libxxf86vm1 libxfixes3 libxrender1 libxkbcommon0 libsm6 libice6 libgl1 libegl1 libglu1-mesa libgomp1 \
 && curl -fsSL "https://download.blender.org/release/Blender${BLENDER_VERSION%.*}/blender-${BLENDER_VERSION}-linux-x64.tar.xz" -o /tmp/b.tar.xz \
 && curl -fsSL "https://download.blender.org/release/Blender${BLENDER_VERSION%.*}/blender-${BLENDER_VERSION}.sha256" -o /tmp/b.sha256 \
 && (cd /tmp && grep "linux-x64.tar.xz" b.sha256 | sed 's#  .*#  b.tar.xz#' | sha256sum -c -) \
 && mkdir -p /opt/blender && tar -xJf /tmp/b.tar.xz -C /opt/blender --strip-components=1 && rm -f /tmp/b.* \
 && apt-get purge -y xz-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /worker
COPY *.py ./
RUN useradd -m worker && chown -R worker /worker
USER worker
# config.json is written from env at start (never baked into the image).
CMD ["/bin/sh", "-c", "umask 077 && python3 -c 'import json,os;json.dump({\"url\":os.environ[\"KIW_SHOP_URL\"],\"token\":os.environ[\"KIW_BLENDER_WORKER_TOKEN\"]},open(\"/worker/config.json\",\"w\"))' && /opt/blender/blender --version | head -1 && python3 worker.py --config /worker/config.json --blender /opt/blender/blender --heartbeat-only && exec python3 worker.py --config /worker/config.json --blender /opt/blender/blender"]
