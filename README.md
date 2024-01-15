# Xbox-xCloud-Player

Xbox-Xcloud-Player is a library that can connect to an xCloud / xHome stream using WebRTC and provides an API interface for controlling the stream.

## Install

Add the xbox-cloud-player package using npm or yarn:

    npm install xbox-cloud-player --save

## Local development

### Requirements

    - NodeJS
    - npm

### Steps to get up and running

Clone the repository:

    git clone https://github.com/unknownskl/xbox-xcloud-player.git
    cd xbox-xcloud-player

Install dependencies:

    npm ci

Login to Gamepass using your Xbox Account:

    npm run auth

Run development build in watch mode:

    npm run watch

Create production build:

    npm run build