#!/usr/bin/env bash

if [[ $# -eq 0 ]]; then
	echo "Usage:" $0 "path/to/vault"
	exit 1
fi

vault=$1

if [[ -d "$vault" ]]; then
	files=(main.js manifest.json styles.css)
	for file in "${files[@]}"; do
		echo "$vault/$file"
		cp "$file" "$vault"/"$file"
		done
else
	echo "$vault is not a dir or doesn't exists"
fi
