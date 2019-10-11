{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell rec {
  name = "personal-website";
  buildInputs = with pkgs; [
    nodejs
    pandoc
    texlive.combined.scheme-full
    optipng
    gifsicle
    python2
  ];
  shellHook = ''
    export PATH="$PWD/node_modules/.bin:$PATH"
  '';
}
