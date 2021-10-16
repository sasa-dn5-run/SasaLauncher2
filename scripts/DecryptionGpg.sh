#!/bin/bash

gpg --quiet --batch --yes --decrypt --passphrase=$GPGPASS --output src/config.json secret.json.gpg