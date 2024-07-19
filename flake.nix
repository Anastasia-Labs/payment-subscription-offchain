{
  description = "A Nix-flake-based Node.js development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:

    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [
          (self: super: {
            nodejs = super.nodejs-18_x;
            pnpm = super.nodePackages.pnpm;
          })
        ];
        pkgs = import nixpkgs { inherit overlays system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [ nodejs pnpm ];

          shellHook = ''
            echo "node `${pkgs.nodejs}/bin/node --version`"
          '';
        };
      }
    );
}