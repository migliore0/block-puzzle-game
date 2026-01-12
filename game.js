const c=document.getElementById("game")
const ctx=c.getContext("2d")

c.width=360
c.height=640

const GRID=8
const CELL=42
const FX=(360-GRID*CELL)/2
const FY=140
const SPAWN_Y=560

const SNAP_RADIUS=CELL*0.6
const DRAG_OFFSET_Y=2

const UI_BG="#F2F4F8"
const BOARD_BG="#E6EAF2"
const GRID_CELL="#CBD3E1"
const BOARD_FRAME="#9FA8DA"

const COLORS=[
"#FF8A80","#FFD180","#82B1FF",
"#A7FFEB","#B388FF","#FFAB91"
]

const SHAPES=[
[[0,0]],
[[0,0],[1,0]],
[[0,0],[1,0],[2,0]],
[[0,0],[1,0],[2,0],[3,0]],
[[0,0],[0,1]],
[[0,0],[0,1],[0,2]],
[[0,0],[1,0],[0,1]],
[[0,0],[1,0],[2,0],[1,1]],
[[0,0],[1,0],[0,1],[1,1]],
[[0,0],[1,0],[2,0],[0,1]],
[[0,0],[0,1],[1,1],[2,1]],
[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],
[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]
]

let field,figures,dragging,preview
let score=0,visualScore=0
let best=+localStorage.best||0
let particles=[]
let comboText=null
let audioCtx=null
let paused=false
let showGameOver=false
let canContinue=true

function audio(){
if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)()
}

function sound(f=300,d=0.06,v=0.08){
if(!audioCtx)return
const o=audioCtx.createOscillator()
const g=audioCtx.createGain()
o.frequency.value=f
g.gain.value=v
o.connect(g)
g.connect(audioCtx.destination)
o.start()
o.stop(audioCtx.currentTime+d)
}

function vibrate(ms){if(navigator.vibrate)navigator.vibrate(ms)}

function bounds(s){
let w=0,h=0
s.forEach(b=>{w=Math.max(w,b[0]);h=Math.max(h,b[1])})
return{w:w+1,h:h+1}
}

function canPlace(s,gx,gy){
return s.every(b=>{
let x=gx+b[0],y=gy+b[1]
return x>=0&&y>=0&&x<GRID&&y<GRID&&!field[y][x]
})
}

function anyFits(s){
for(let y=0;y<GRID;y++)
for(let x=0;x<GRID;x++)
if(canPlace(s,x,y))return true
return false
}

function anyMoves(){
for(let f of figures)
if(anyFits(f.shape))return true
return false
}

function pickSmartShape(){
let pool=SHAPES.filter(s=>anyFits(s))
if(!pool.length)pool=[SHAPES[0]]
return pool[Math.random()*pool.length|0]
}

function spawnSet(){
figures=[]
for(let i=0;i<3;i++){
let s=pickSmartShape()
let b=bounds(s)
figures.push({
shape:s,
color:COLORS[Math.random()*COLORS.length|0],
homeX:60+i*120,
homeY:SPAWN_Y-b.h*CELL,
x:60+i*120,
y:700,
tx:60+i*120,
ty:SPAWN_Y-b.h*CELL,
vy:0,
bounce:true,
scale:0.9
})
}
}

function init(){
field=Array.from({length:GRID},()=>Array(GRID).fill(null))
figures=[]
preview=[]
particles=[]
comboText=null
score=visualScore=0
paused=false
showGameOver=false
canContinue=true
spawnSet()
}

function rr(x,y,w,h,r){
ctx.beginPath()
ctx.moveTo(x+r,y)
ctx.arcTo(x+w,y,x+w,y+h,r)
ctx.arcTo(x+w,y+h,x,y+h,r)
ctx.arcTo(x,y+h,x,y,r)
ctx.arcTo(x,y,x+w,y,r)
ctx.closePath()
}

function drawBlock(x,y,col){
ctx.fillStyle="rgba(0,0,0,.12)"
rr(x,y,CELL,CELL,10)
ctx.fill()
ctx.fillStyle=col
rr(x,y,CELL,CELL,10)
ctx.fill()
ctx.fillStyle="rgba(255,255,255,.35)"
rr(x+6,y+6,CELL-18,6,4)
ctx.fill()
}

function spawnParticles(x,y,col,c=12){
for(let i=0;i<c;i++){
particles.push({
x:x+CELL/2,y:y+CELL/2,
vx:(Math.random()-.5)*4,
vy:(Math.random()-.8)*4,
life:30,c:col
})
}
}

function clearLines(){
let rows=[],cols=[]
for(let y=0;y<GRID;y++)if(field[y].every(c=>c))rows.push(y)
for(let x=0;x<GRID;x++)if(field.every(r=>r[x]))cols.push(x)
let cleared=rows.length+cols.length
if(!cleared)return

rows.forEach(y=>{
for(let x=0;x<GRID;x++){
spawnParticles(FX+x*CELL,FY+y*CELL,field[y][x])
field[y][x]=null
}
})
cols.forEach(x=>{
for(let y=0;y<GRID;y++){
spawnParticles(FX+x*CELL,FY+y*CELL,field[y][x])
field[y][x]=null
}
})

let mult=cleared>=3?3:cleared==2?2:1
score+=cleared*100*mult
comboText={t:"COMBO x"+mult,a:60}
sound(220+mult*120)
vibrate(20*mult)
}

function findSnapPosition(f){
let best=null,bd=1e9
for(let y=0;y<GRID;y++)
for(let x=0;x<GRID;x++){
if(canPlace(f.shape,x,y)){
let cx=FX+x*CELL
let cy=FY+y*CELL
let d=Math.hypot(f.tx-cx,f.ty-cy)
if(d<bd){bd=d;best={x,y}}
}
}
if(best&&bd<SNAP_RADIUS)return best
return null
}

function draw(){
ctx.fillStyle=UI_BG
ctx.fillRect(0,0,360,640)

ctx.fillStyle=BOARD_FRAME
rr(FX-18,FY-18,GRID*CELL+36,GRID*CELL+36,28)
ctx.fill()

ctx.fillStyle=BOARD_BG
rr(FX-10,FY-10,GRID*CELL+20,GRID*CELL+20,22)
ctx.fill()

for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
ctx.strokeStyle=GRID_CELL
rr(FX+x*CELL,FY+y*CELL,CELL,CELL,8)
ctx.stroke()
if(field[y][x])drawBlock(FX+x*CELL,FY+y*CELL,field[y][x])
}

preview.forEach(p=>{
ctx.globalAlpha=.45
drawBlock(FX+p[0]*CELL,FY+p[1]*CELL,"#fff")
ctx.globalAlpha=1
})

figures.forEach(f=>{
f.x+=(f.tx-f.x)*0.8
if(f.bounce){
f.vy+=1.2
f.y+=f.vy
if(f.y>=f.ty){
f.y=f.ty
f.vy*=-0.4
if(Math.abs(f.vy)<0.8)f.bounce=false
}
}else f.y+=(f.ty-f.y)*0.8

let b=bounds(f.shape)
ctx.save()
ctx.translate(f.x+CELL*b.w/2,f.y+CELL*b.h/2)
ctx.scale(f.scale,f.scale)
ctx.translate(-CELL*b.w/2,-CELL*b.h/2)
f.shape.forEach(p=>drawBlock(p[0]*CELL,p[1]*CELL,f.color))
ctx.restore()
})

visualScore+=(score-visualScore)*0.15
ctx.fillStyle="#333"
ctx.font="600 36px Arial"
ctx.textAlign="center"
ctx.fillText(Math.floor(visualScore),180,80)
ctx.font="14px Arial"
ctx.fillText("BEST "+best,180,105)

if(comboText){
ctx.font="20px Arial"
ctx.fillStyle="rgba(0,0,0,"+(comboText.a/60)+")"
ctx.fillText(comboText.t,180,140)
comboText.a--
if(comboText.a<=0)comboText=null
}

particles.forEach(p=>{
ctx.globalAlpha=p.life/30
ctx.fillStyle=p.c
ctx.fillRect(p.x,p.y,4,4)
p.x+=p.vx
p.y+=p.vy
p.vy+=0.15
p.life--
})
particles=particles.filter(p=>p.life>0)
ctx.globalAlpha=1

if(showGameOver){
ctx.fillStyle="rgba(0,0,0,.6)"
ctx.fillRect(0,0,360,640)
ctx.fillStyle="#fff"
ctx.textAlign="center"
ctx.font="700 32px Arial"
ctx.fillText("GAME OVER",180,240)
ctx.font="22px Arial"
if(canContinue)ctx.fillText("▶ Continue",180,300)
ctx.fillText("🔁 Restart",180,350)
}

ctx.font="26px Arial"
ctx.textAlign="right"
ctx.fillText("⚙",350,40)
}

c.onpointerdown=e=>{
audio()
let r=c.getBoundingClientRect()
let mx=e.clientX-r.left,my=e.clientY-r.top

if(showGameOver){
if(canContinue&&my>280&&my<320){
canContinue=false
showGameOver=false
paused=false
let y=Math.random()*GRID|0
for(let x=0;x<GRID;x++)field[y][x]=null
spawnSet()
return
}
if(my>330&&my<380){init();return}
}

figures.forEach(f=>{
let b=bounds(f.shape)
if(mx>f.x&&mx<f.x+b.w*CELL&&my>f.y&&my<f.y+b.h*CELL){
dragging=f
f.scale=1
sound(500)
vibrate(10)
}
})
}

c.onpointermove=e=>{
if(!dragging||paused)return
let r=c.getBoundingClientRect()
dragging.tx=e.clientX-r.left-CELL
dragging.ty=e.clientY-r.top-CELL*DRAG_OFFSET_Y
preview=[]
let snap=findSnapPosition(dragging)
if(snap)
dragging.shape.forEach(b=>preview.push([snap.x+b[0],snap.y+b[1]]))
}

c.onpointerup=()=>{
if(!dragging||paused)return
let f=dragging
let snap=findSnapPosition(f)
if(snap){
f.shape.forEach(b=>{
field[snap.y+b[1]][snap.x+b[0]]=f.color
spawnParticles(FX+(snap.x+b[0])*CELL,FY+(snap.y+b[1])*CELL,f.color)
})
score+=f.shape.length*10
best=Math.max(best,score)
localStorage.best=best
sound(220)
vibrate(20)
figures=figures.filter(x=>x!==f)
clearLines()
if(!figures.length)spawnSet()
if(!anyMoves()){showGameOver=true;paused=true}
}else{
f.tx=f.homeX
f.ty=f.homeY
f.scale=0.9
}
dragging=null
preview=[]
}

function loop(){draw();requestAnimationFrame(loop)}
init()
loop()