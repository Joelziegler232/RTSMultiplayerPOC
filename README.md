# RTSMultiplayerPOC
[![Node.js CI](https://github.com/keshav2010/RTSMultiplayerPOC/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/keshav2010/RTSMultiplayerPOC/actions/workflows/node.js.yml)

Multiplayer RTS Dedicated Game Server written in NodeJS for a small-scale game.

Approach

1. Client send their Inputs/State
2. Server pushes client requests in a FIFO approach
3. Server update game state in each tick (gameserver may ideally have a tick rate of say 10, i.e 100ms are allocated for each tick)
4. Server also builds a cumulativeUpdate packet (delta updates)
5. Server send back delta updates (stored in cumulativeUpdate array) back to all clients

This is a timestep based approach that makes sure server only send delta updates back to all clients instead of whole game state.

# Preview (Debug info is displayed for each unit)

[![Image from Gyazo](https://i.gyazo.com/feeede8b589d2119c8af020fd952c707.gif)](https://gyazo.com/feeede8b589d2119c8af020fd952c707)

Both the GIFs shows basic boid avoidance behaviour
[![Image from Gyazo](https://i.gyazo.com/2dec336b740c0d9ecf454c53cac8991f.gif)](https://gyazo.com/2dec336b740c0d9ecf454c53cac8991f)


# Getting Started

1. Build the client side code, this includes phaser related code that is used to draw/render game on the browser.
> npm run build


2. Once done, simply run the server.
> npx ts-node server.ts

3. Check the port where server is running and you're good to go.
   1. Create game room
   2. open another window on same url, click on join room (it may take few seconds)
