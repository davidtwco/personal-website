# Deprecation notice
This project has been archived and isn't used anymore, the current version of this website is
generated by Nix and lives in the [davidtwco/veritas](https://github.com/davidtwco/veritas)
repository.

# davidtw.co
My new, improved personal website featuring projects, writings and CV generation. Built using Metalsmith and deployed on Netlify.

I wanted to make something that was simple, fast and low maintenance while still being flexible enough to be built upon in future.

## How does this all work then?
Here's a [link to the website in this repository's post](https://davidtw.co/writings/2017/rebuilding-my-portfolio/) describing how I made this.

## How do I get it running?
If you want to run this website locally, you'll need to start by cloning the repository; then you'll have to install all the dependencies of the website (assuming you already have [Node.js](https://nodejs.org/en/) installed); after that, you can just run the serve command and visit the website at `localhost:3000`:

```
$ git clone https://github.com/davidtwco/personal-website.git
$ npm install
$ gulp serve
```

## Attribution
CV generation functionality of this project uses a template which is a modified version of the [Awesome-CV](https://github.com/posquit0/Awesome-CV) template licensed as CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
