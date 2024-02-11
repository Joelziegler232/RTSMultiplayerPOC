import { PacketType } from "../../common/PacketType";
import { SoldierType } from "../../common/SoldierType";
import { PlayerState } from "../../gameserver/schema/PlayerState";
import { SoldierState } from "../../gameserver/schema/SoldierState";
import { NetworkManager } from "../NetworkManager";
import CONSTANT from "../constant";
const { GAMEEVENTS } = CONSTANT;
import { PlayerCastle } from "../gameObjects/playerCastle";
import SessionStateClientHelpers from "../helpers/SessionStateClientHelpers";
import { BaseSoldier } from "../soldiers/BaseSoldier";
import { Spearman } from "../soldiers/Spearman";
import { BaseScene } from "./BaseScene";
import $ from "jquery";

var selectorGraphics: Phaser.GameObjects.Graphics;
var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw = false;

var pointerDownWorldSpace: { x: any; y: any } | null = null;
var cursors;

var networkManager: NetworkManager;
function SendChatMessage() {
  try {
    var messageText = $("#chat-message").val();
    networkManager.sendEventToServer(PacketType.ByClient.CLIENT_SENT_CHAT, {
      message: messageText,
    });
  } catch (err) {
    console.error(err);
  }
}
function addNewChatMessage(msg: string, sender: string) {
  let msgBlock = `<div>
        <div class="d-flex justify-content-between">
            <p class="small mb-1">${sender}</p>
        </div>
        <div class="d-flex flex-row justify-content-start">
            <div>
                <p style="background-color: #f5f6f7;">
                    ${msg}
                </p>
            </div>
        </div>
    </div>`;
  $(".chat-body").append(msgBlock);
}
$(() => {
  $("#send-chat-btn").on("click", function () {
    SendChatMessage();
  });
});
export class GameScene extends BaseScene {
  mapWidth: number;
  mapHeight: number;
  controls?: Phaser.Cameras.Controls.SmoothedKeyControl;

  // list of own soldiers that are selected by player in game.
  selectedSoldiersMap: Map<string, BaseSoldier> = new Map<
    string,
    BaseSoldier
  >();

  // maps every soldier id to its phaser object that is dispalyed on screen.
  soldierIdToPhaserObject: Map<string, BaseSoldier> = new Map<
    string,
    BaseSoldier
  >();

  playerToSoldierObjectMap: Map<string, Map<string, BaseSoldier>> = new Map<
    string,
    Map<string, BaseSoldier>
  >();

  constructor() {
    super(CONSTANT.SCENES.GAME);
    this.mapWidth = 3500;
    this.mapHeight = 1500;
  }
  preload() {
    this.load.image("playbutton", "../assets/playbutton.png");
    this.load.image("knight", "../assets/knight.png");
    this.load.image("spearman", "../assets/spearman.png");
    this.load.image("map", "../assets/map.png");
    this.load.image("flag", "../assets/flag.png");
  }

  onSoldierAdded(soldier: SoldierState, ownerPlayer: PlayerState) {
    const spearmen = new Spearman(
      this,
      soldier.currentPositionX,
      soldier.currentPositionY,
      "SPEARMAN",
      null,
      {
        health: soldier.health,
        speed: soldier.speed,
        cost: soldier.cost,
        damage: soldier.damage,
        id: soldier.id,
      },
      ownerPlayer.id
    );

    let soldiersMap = this.playerToSoldierObjectMap.get(soldier.playerId);
    if (!soldiersMap) {
      this.playerToSoldierObjectMap.set(
        soldier.playerId,
        new Map<string, BaseSoldier>()
      );
      soldiersMap = this.playerToSoldierObjectMap.get(soldier.playerId);
    }
    soldiersMap!.set(soldier.id, spearmen);
    this.soldierIdToPhaserObject.set(soldier.id, spearmen);
  }

  onSoldierRemoved(soldier: SoldierState, ownerPlayer: PlayerState) {
    this.selectedSoldiersMap.delete(soldier.id);
    this.playerToSoldierObjectMap.get(ownerPlayer.id)?.delete(soldier.id);
    this.soldierIdToPhaserObject.delete(soldier.id);
    this.DestroyStateChangeListener(soldier.id);
  }

  onSoldierSelected(soldierId: string) {
    const playerId = networkManager.getClientId();
    if (!playerId) {
      return;
    }
    const soldierPhaserObj = this.playerToSoldierObjectMap
      .get(playerId)
      ?.get(soldierId);
    if (!soldierPhaserObj) return;
    this.selectedSoldiersMap.set(soldierId, soldierPhaserObj);
  }

  onSoldierUnselected(soldierId: string) {
    this.selectedSoldiersMap.delete(soldierId);
  }

  onSoldierPositionChanged(soldierId: string) {
    const phaserSceneObject = this.soldierIdToPhaserObject.get(soldierId);
    const playerId = phaserSceneObject?.playerId;
    if (!playerId) return;

    const state = networkManager.getState();
    if (!state) return;
    const playerState = SessionStateClientHelpers.getPlayer(state, playerId);

    if (!playerState) {
      return;
    }

    const soldierState = SessionStateClientHelpers.getSoldier(
      state,
      playerState,
      soldierId
    );

    if (!soldierState) return;

    phaserSceneObject.setPosition(
      soldierState.currentPositionX,
      soldierState.currentPositionY
    );
  }

  onSoldierHealthUpdate(
    soldier: SoldierState,
    value: number,
    prevValue: number
  ) {
    this.playerToSoldierObjectMap
      .get(soldier.playerId)
      ?.get(soldier.id)
      ?.setHealth(value);
  }

  create() {
    networkManager = this.registry.get("networkManager") as NetworkManager;

    selectorGraphics = this.AddObject(this.add.graphics());
    this.AddInputEvent("pointerdown", (pointer: any) => {
      if (pointer.button === 0) {
        //lmb
        selectorGraphics.clear();
        this.selectedSoldiersMap.clear();

        selectorDraw = true;
        pointerDownWorldSpace = {
          x: pointer.worldX,
          y: pointer.worldY,
        };
      }
      //mmb
      else if (pointer.button === 1) {
        console.log("Requesting Soldier Spawn/Create ");
        networkManager.sendEventToServer(
          PacketType.ByClient.SOLDIER_CREATE_REQUESTED,
          {
            soldierType: "SPEARMAN",
          }
        );
      } else if (pointer.button === 2) {
        //if any soldier selected
        if (this.selectedSoldiersMap.size > 0) {
          //If enemy unit in nearby radius, randomly select 1 and send attack signal
          let searchAreaSize = 35;
          let rect = new Phaser.Geom.Rectangle(
            pointer.worldX - searchAreaSize / 2,
            pointer.worldY - searchAreaSize / 2,
            searchAreaSize,
            searchAreaSize
          );
          selectorGraphics.strokeRectShape(rect);

          const soldiers = Array.from(
            this.playerToSoldierObjectMap.values()
          ).map((soldiersMap) => Array.from(soldiersMap.values()));
          const soldiersArray = soldiers.flat(1);

          const otherPlayerSoldiers = soldiersArray.filter(
            (d) => d.playerId !== networkManager.getClientId()
          );

          // select atmost 1 target soldier (enemy unit to be attacked)
          let targetSoldier = null;
          for (let i = 0; i < otherPlayerSoldiers.length; i++) {
            let soldier = otherPlayerSoldiers[i];
            let bound = soldier.getBounds();
            selectorGraphics.strokeRectShape(bound);
            if (Phaser.Geom.Intersects.RectangleToRectangle(bound, rect)) {
              targetSoldier = soldier;
              break;
            }
          }

          //if wants to attack a soldier, mark it as target
          if (targetSoldier) {
            const selectedSoldiersForAttack = Array.from(
              this.selectedSoldiersMap.values()
            );
            networkManager.sendEventToServer(
              PacketType.ByClient.SOLDIER_ATTACK_REQUESTED,
              {
                soldiers: selectedSoldiersForAttack.map((v) => v.id).join(","),
                targetPlayerId: targetSoldier.playerId,
                targetSoldierId: targetSoldier.id,
              }
            );
          } else {
            networkManager.sendEventToServer(
              PacketType.ByClient.SOLDIER_MOVE_REQUESTED,
              {
                soldiers: [...this.selectedSoldiersMap.values()]
                  .map((v) => v.id)
                  .join(","),
                expectedPositionX: pointer.worldX,
                expectedPositionY: pointer.worldY,
              }
            );
          }
        }

        //this.scene.events.emit(GAMEEVENTS.RIGHT_CLICK, pointer.position);
      }
    });
    this.AddInputEvent("pointerup", () => {
      selectorDraw = false;
      selectorGraphics.clear();
      pointerDownWorldSpace = null;
    });

    this.AddInputEvent("pointermove", (pointer: any) => {
      if (!pointer.isDown) {
        selectorGraphics.clear();
        return;
      }
      if (selectorDraw && pointer.button === 0) {
        selectorGraphics.clear();
        selectorGraphics.lineStyle(selectorThickness, selectorColor, 1);

        let rect = new Phaser.Geom.Rectangle(
          pointerDownWorldSpace?.x,
          pointerDownWorldSpace?.y,
          pointer.worldX - pointerDownWorldSpace?.x,
          pointer.worldY - pointerDownWorldSpace?.y
        );
        if (rect.width < 0) {
          rect.x += rect.width;
          rect.width = Math.abs(rect.width);
        }
        if (rect.height < 0) {
          rect.y += rect.height;
          rect.height = Math.abs(rect.height);
        }
        selectorGraphics.strokeRectShape(rect);

        //for every sprite belonging to this player, check if it overlaps with rect
        const playerId = networkManager.getClientId();
        if (!playerId) {
          console.log(`player id ${playerId} not found`);
          return;
        }

        let s = this.playerToSoldierObjectMap.get(playerId)?.values();
        if (!s) return;
        let soldiers = [...s];

        soldiers.forEach((soldier) => {
          let bound = soldier.getBounds();
          if (Phaser.Geom.Intersects.RectangleToRectangle(bound, rect)) {
            soldier.markSelected();
          } else {
            soldier.markUnselected();
          }
        });
      } else if (pointer.button === 2 && pointer.isDown) {
        //mmb down
        this.cameras.main.scrollX -=
          (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -=
          (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });

    this.scene.launch(CONSTANT.SCENES.HUD_SCORE);

    this.cameras.main
      .setBounds(0, 0, this.mapWidth, this.mapHeight)
      .setName("WorldCamera");

    var mapGraphics = this.AddObject(this.add.graphics());
    mapGraphics.depth = -5;
    mapGraphics.fillStyle(0x002200, 1);
    mapGraphics.fillRect(0, 0, this.mapWidth, this.mapHeight);

    cursors = this.input.keyboard?.createCursorKeys();
    const controlConfig = {
      camera: this.cameras.main,
      left: cursors?.left,
      right: cursors?.right,
      up: cursors?.up,
      down: cursors?.down,
      drag: 0.001,
      acceleration: 0.02,
      maxSpeed: 1.0,
    };
    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(
      controlConfig
    );

    this.AddSceneEvent(
      PacketType.ByServer.NEW_CHAT_MESSAGE,
      (data: { message: string; playerId: string }) => {
        let { message, playerId } = data;
        addNewChatMessage(message, playerId);
      }
    );

    const state = networkManager.getState();
    if (!state) return;
    this.AddStateChangeListener(
      state.players.onChange((playerState) => {
        this.AddStateChangeListener(
          playerState.soldiers.onAdd((soldierState) => {
            this.onSoldierAdded(soldierState, playerState);
          })
        );
        this.AddStateChangeListener(
          playerState.soldiers.onRemove((soldierState) => {
            this.onSoldierRemoved(soldierState, playerState);
          })
        );
        playerState.soldiers.forEach((soldier) => {
          const cb = soldier.listen("health", (value, prevValue) => {
            this.onSoldierHealthUpdate(soldier, value, prevValue);
          });
          this.AddStateChangeListener(cb, soldier.id);
        });

        playerState.soldiers.forEach((soldier) => {
          this.AddStateChangeListener(
            soldier.listen("currentPositionX", (value, prevValue) => {
              this.onSoldierPositionChanged(soldier.id);
            })
          );
          this.AddStateChangeListener(
            soldier.listen("currentPositionY", (value, prevValue) => {
              this.onSoldierPositionChanged(soldier.id);
            })
          );
        });
      })
    );

    this.AddStateChangeListener(
      state.players.onRemove((player) => {
        this.events.emit(PacketType.ByServer.PLAYER_LEFT, {
          playerState: player,
        });
      })
    );

    this.AddStateChangeListener(
      state
        .getPlayer(networkManager.getClientId()!)!
        .listen("resources", (value) => {
          this.events.emit(PacketType.ByServer.PLAYER_RESOURCE_UPDATED, {
            playerId: networkManager.getClientId()!,
            resources: value,
          });
        })
    );

    this.AddSceneEvent(GAMEEVENTS.SOLDIER_SELECTED, (d: BaseSoldier) => {
      this.onSoldierSelected(d.id);
    });

    this.AddInputEvent(
      "wheel",
      (
        pointer: any,
        gameobjects: any,
        deltaX: number,
        deltaY: number,
        deltaZ: number
      ) => {
        this.cameras.main.setZoom(
          Math.max(0, this.cameras.main.zoom - deltaY * 0.0003)
        );
      }
    );

    //show initial spawnpoint choice on map for player
    networkManager.getState()?.players.forEach((player) => {
      this.AddObject(
        new PlayerCastle(this, player.posX, player.posY, "flag", null, {
          health: 500,
          player: player,
        })
      );
    });

    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });
    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }
  update(delta: number) {
    this.controls?.update(delta);
  }
}
