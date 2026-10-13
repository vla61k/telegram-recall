# Apple Emoji

Local 64px images from emoji-datasource-apple 16.0.0:
https://github.com/iamcal/emoji-data

Apple emoji artwork copyright Apple Inc. The upstream project states that Apple images are not licensed for commercial usage. The MIT license on the package covers its data/code, not commercial rights to Apple artwork. Included here for this local design prototype.

The manifest includes supported emoji and skin-tone sequences. No third-party requests are made when displaying emoji. Original Unicode text remains in application data and is used for search and explicit copy actions.

To regenerate local images and the Unicode manifest after installing dependencies:
node scripts/prepare-emoji.mjs
