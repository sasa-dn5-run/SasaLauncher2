#!/bin/bash

gpg --quiet --batch --yes --decrypt --passphrase=$1 --output src/config.json secret.json.gpg