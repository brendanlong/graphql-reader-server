#!/bin/bash -ex
APP_NAME=graphql-reader-server
REPO="docker.io/brendanlong"

LATEST_TAG="${APP_NAME}:latest"

docker build -t "${LATEST_TAG}" .

if [[ "$1" == "--push" ]]; then
  if [[ -n $(git status -s) ]]; then
    echo "Can't push with uncommited changes"
    exit 1
  fi

  GIT_COMMIT=$(git rev-parse --verify HEAD)

  for VERSION in latest "${GIT_COMMIT}"; do
    TAG="${APP_NAME}:${VERSION}"
    docker tag "${LATEST_TAG}" "${TAG}"
    docker tag "${LATEST_TAG}" "${REPO}/${TAG}"
    docker push "${REPO}/${TAG}"
  done
fi
