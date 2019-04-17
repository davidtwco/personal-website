{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell rec {
  name = "personal-website";
  buildInputs = [
    pkgs.nodejs
    pkgs.pandoc
    pkgs.texlive.combined.scheme-full
    pkgs.optipng
    pkgs.gifsicle
  ];
  shellHook = ''
    export PATH="$PWD/node_modules/.bin:$PATH"
  '';
}
