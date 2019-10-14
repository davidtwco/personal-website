{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell rec {
  name = "personal-website";
  buildInputs = with pkgs; [
    nodejs
    python2

    pandoc
    texlive.combined.scheme-full

    # System dependencies
    autoconf
    automake
    coreutils
    nasm
    pkg-config
    zlib
  ];
  shellHook = ''
    export LD=$CC
    export PATH="$PWD/node_modules/.bin:$PATH"
  '';
}
