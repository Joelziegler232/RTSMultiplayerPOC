const CONSTANT = require('../constant');
const {GAMEEVENTS} = CONSTANT;
const PacketType = require('../../common/PacketType');
const {Spearman} = require('../soldiers/Spearman');
import {BaseScene} from './BaseScene';
const {Column, Viewport, Scrollbar} =  require('phaser-ui-tools');
const ClientStateManager = require('../ClientStateManager');

var buttonState=false;
var socket;

var selectorGraphics;
var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw=false;

export class GameScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.GAME)
    }

    init()
    {
        socket = io.connect('ws://localhost:3000', {
            reconnection: false
        });
        socket.on('connect', ()=>{
        });
        this.stateManager = new ClientStateManager(this);


        //Lasso Selection Code
        selectorGraphics = this.add.graphics();
        this.input.on('pointerdown', function(pointer)
        {
            if(pointer.button === 0){
                selectorDraw=true;
                console.log(pointer);
                console.log('client state manager detected pointer down');
            }
            else if(pointer.button === 2){
                console.log('right click ', pointer.position);
                this.scene.events.emit(GAMEEVENTS.RIGHT_CLICK, pointer.position);
            }
        })
        this.input.on('pointerup', function(pointer){
            selectorDraw=false;
            selectorGraphics.clear();
        })
        this.input.on('pointermove', function(pointer){
            if(selectorDraw && pointer.button === 0){
                selectorGraphics.clear();
                selectorGraphics.lineStyle(selectorThickness, selectorColor, 1);

                let rect = new Phaser.Geom.Rectangle(pointer.downX, pointer.downY, pointer.x - pointer.downX, pointer.y - pointer.downY);
                selectorGraphics.strokeRectShape(rect);

                //for every sprite belonging to this player, check if it overlaps with rect
                let soldiers = this.scene.stateManager.getPlayer().getSoldiers();
                
                soldiers.forEach(soldier=>{
                    let bound = soldier.getBounds();
                    if(Phaser.Geom.Intersects.RectangleToRectangle(bound, rect)){
                        soldier.markSelected();
                    }
                    else{
                        soldier.markUnselected();
                    }
                });
            }
        });

        socket.on('disconnect', reason => {
            console.log(reason);
            this.scene.stop(CONSTANT.SCENES.HUD_SCORE);
            this.scene.start(CONSTANT.SCENES.MENU);
            this.stateManager = null;
        });

        //tick brings in delta updates
        socket.on('tick',(d)=>{
            let deltaChanges = JSON.parse(d).data;
            deltaChanges.forEach(deltaUpdate=>{
                this.events.emit(deltaUpdate.type, deltaUpdate);
            });
        });

        this.scene.launch(CONSTANT.SCENES.HUD_SCORE, this.stateManager);
    }
    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
        this.load.image('knight', "../assets/knight.png");
        this.load.image('spearman', "../assets/spearman.png");
    }
    create(){
        this.playerReadyStatus = new Column(this, 0, 120);
        this.events.on(PacketType.ByClient.PLAYER_JOINED, (data)=>{
            console.log('Player Joined Game  : ', data);
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.player.id} Joined`))
        });
        this.events.on(PacketType.ByClient.PLAYER_JOINED, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.player.id} Joined`))
        });
        this.events.on(PacketType.ByClient.PLAYER_READY, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.playerId} Ready`))
        });
        this.events.on(PacketType.ByClient.PLAYER_UNREADY, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.playerId} Marked UnReady`))
        });

        var ReadyButton = this.add.text(200, 220, "I'm Ready!").setInteractive().on('pointerdown', ()=>{
            buttonState=!buttonState;
            ReadyButton.setColor(buttonState ? 'green':'white');
            if(buttonState)
                socket.emit(PacketType.ByClient.PLAYER_READY, {});
            else
                socket.emit(PacketType.ByClient.PLAYER_UNREADY,{});
        });
        var QuitButton = this.add.text(700, 220, "Leave Server").setInteractive().on('pointerdown', ()=>{
            console.log("Quit");
            socket.disconnect();
        });
    }
    update(time, delta){
        this.stateManager.update(time, delta);
    }
}