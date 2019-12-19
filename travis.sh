#!/bin/bash
set -ev

# Update the system and install required packages for building.
sudo apt-get update
sudo apt-get install -y --no-install-recommends build-essential wget libfontconfig1 pandoc

# Download TeXLive installer.
wget http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz

# Extract installer.
sudo mkdir /install-tl-unx
sudo tar -xvf install-tl-unx.tar.gz -C /install-tl-unx --strip-components=1

# Run installer with 'scheme-basic' scheme.
sudo bash -c 'echo "selected_scheme scheme-basic" >> /install-tl-unx/texlive.profile'
sudo /install-tl-unx/install-tl -profile /install-tl-unx/texlive.profile

# Remove installer.
sudo rm -r /install-tl-unx
sudo rm install-tl-unx.tar.gz

# Added TeXLive to PATH.
export PATH="/usr/local/texlive/2019/bin/x86_64-linux:${PATH}"

# Install other required TeX packages.
sudo /usr/local/texlive/2019/bin/x86_64-linux/tlmgr install latexmk \
  xetex \
  enumitem \
  ms \
  fancyhdr \
  xcolor \
  iftex \
  xifthen \
  etoolbox \
  setspace \
  fontspec \
  unicode-math \
  sourcesanspro \
  tcolorbox \
  parskip \
  moresize \
  hyperref \
  adjustbox \
  needspace \
  ifmtarg \
  filehook \
  xkeyval \
  pgf \
  environ \
  trimspaces \
  collectbox \
  collection-fontsrecommended \
  pdftexcmds \
  letltxmacro \
  pdfescape \
  bitset \
  ragged2e

# Install Gulp.
npm install -g gulp-cli
# Install other build dependencies.
npm install

# Build static site and PDF (split into multiple tasks so Node can shut down and free up some
# memory).
gulp assets
gulp metalsmith
gulp faviconCopy

# Deploy website.
wget https://github.com/netlify/netlifyctl/releases/download/v0.3.2/netlifyctl-linux-amd64-0.3.2.tar.gz
tar xvzf netlifyctl-linux-amd64-0.3.2.tar.gz
./netlifyctl -y -A $NETLIFY_ACCESS_TOKEN deploy -s $NETLIFY_SITE_ID -b ./dist/site -n "$TRAVIS_COMMIT_MESSAGE"
