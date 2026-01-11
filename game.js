<canvas id="game"></canvas>
<script>
const c=document.getElementById("game")
const ctx=c.getContext("2d")

c.width=360
c.height=640

const GRID=8
const CELL=42
const FX=(360-GRID*CELL)/2
const FY=140

const BG_COLOR="#ECEFF1"
const FIELD_BG="#B0BEC5"
const FRAME_COLOR="#90A4AE"
const GRID_LINE="#CFD8DC"
const TEXT_COLOR="#37474F"

const COLORS=["#F48B82","#F6D365","#8EC5FC","#9BE7C4","#C7B7E2","#F7B267"]

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
let audioCtx
let paused=false
let showMenu=false
let showGameOver=false
let canContinue=true

function cloneField(f){return f.map(r=>r.slice())}

function bounds(s){
let w=0,h=0
s.forEach(b=>{w=Math.max(w,b[0]);h=Math.max(h,b[1])})
return{w:w+1,h:h+1}
}

function canPlaceOn(f,s,x,y){
return s.every(b=>{
let nx=x+b[0],ny=y+b[1]
return nx>=0&&ny>=0&&nx<GRID&&ny<GRID&&!f[ny][nx]
})
}

function anyMoveOn(f,shapes){
for(let s of shapes)
for(let y=0;y<GRID;y++)
for(let x=0;x<GRID;x++)
if(canPlaceOn(f,s,x,y))return true
return false
}

function fillRatio(){
let c=0
for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++)if(field[y][x])c++
return c/(GRID*GRID)
}

function pickShapePool(){
let fill=fillRatio()
let pool=SHAPES.filter(s=>{
for(let y=0;y<GRID;y++)
for(let x=0;x<GRID;x++)
if(canPlaceOn(field,s,x,y))return true
return false
})
if(!pool.length) pool=[SHAPES[0]]
if(fill>0.75){
pool=pool.sort((a,b)=>bounds(a).w*bounds(a).h - bounds(b).w*bounds(b).h).slice(0,4)
}
return pool
}

function generateSmartSet(){
for(let t=0;t<12;t++){
let shapes=[]
let pool=pickShapePool()
while(shapes.length<3){
let s=pool[Math.random()*pool.length|0]
if(!shapes.includes(s))shapes.push(s)
}
if(anyMoveOn(field,shapes)) return shapes
}
return [SHAPES[0],SHAPES[1],SHAPES[2]]
}

function init(){
field=Array.from({length:GRID},()=>Array(GRID).fill(null))
figures=[]
dragging=null
preview=[]
particles=[]
comboText=null
score=0
visualScore=0
paused=false
showMenu=false
showGameOver=false
canContinue=true
spawnSet()
}

function spawnSet(){
figures=[]
let shapes=generateSmartSet()
for(let i=0;i<3;i++){
let s=shapes[i]
let b=bounds(s)
figures.push({
shape:s,
color:COLORS[Math.random()*COLORS.length|0],
homeX:60+i*120,
homeY:560-b.h*CELL*0.9,
x:60+i*120,
y:700,
tx:60+i*120,
ty:560-b.h*CELL*0.9,
vy:0,
bounce:true,
scale:0.9
})
}
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
ctx.fillStyle="rgba(0,0,0,.2)"
rr(x+4,y+6,CELL-8,CELL-8,8)
ctx.fill()
ctx.fillStyle=col
rr(x,y,CELL-8,CELL-8,8)
ctx.fill()
ctx.fillStyle="rgba(255,255,255,.35)"
rr(x+6,y+6,CELL-20,6,4)
ctx.fill()
}

function draw(){
ctx.clearRect(0,0,360,640)
ctx.fillStyle=BG_COLOR
ctx.fillRect(0,0,360,640)

ctx.fillStyle=FIELD_BG
rr(FX-14,FY-14,GRID*CELL+28,GRID*CELL+28,24)
ctx.fill()

for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
ctx.strokeStyle=GRID_LINE
rr(FX+x*CELL,FY+y*CELL,CELL,CELL,8)
ctx.stroke()
if(field[y][x])drawBlock(FX+x*CELL,FY+y*CELL,field[y][x])
}

preview.forEach(p=>{
ctx.globalAlpha=.5
drawBlock(FX+p[0]*CELL,FY+p[1]*CELL,"#FFFFFF")
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
if(Math.abs(f.vy)<0.8){f.bounce=false;f.vy=0}
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

visualScore+=(score-visualScore)*0.12
ctx.fillStyle=TEXT_COLOR
ctx.font="600 36px Arial"
ctx.textAlign="center"
ctx.fillText(Math.floor(visualScore),180,80)
ctx.font="14px Arial"
ctx.fillText("BEST "+best,180,105)

ctx.font="26px Arial"
ctx.textAlign="right"
ctx.fillText("⚙",350,40)
}

c.onpointerdown=e=>{
let r=c.getBoundingClientRect()
let mx=e.clientX-r.left,my=e.clientY-r.top
if(mx>310&&my<60){showMenu=!showMenu;paused=showMenu;return}
figures.forEach(f=>{
let b=bounds(f.shape)
if(mx>f.x&&mx<f.x+b.w*CELL&&my>f.y&&my<f.y+b.h*CELL){
dragging=f
f.scale=1
}
})
}

c.onpointermove=e=>{
if(!dragging||paused)return
let r=c.getBoundingClientRect()
dragging.tx=e.clientX-r.left-CELL
dragging.ty=e.clientY-r.top-CELL*2
preview=[]
let gx=Math.round((dragging.tx-FX)/CELL)
let gy=Math.round((dragging.ty-FY)/CELL)
if(canPlaceOn(field,dragging.shape,gx,gy))
dragging.shape.forEach(b=>preview.push([gx+b[0],gy+b[1]]))
}

c.onpointerup=()=>{
if(!dragging||paused)return
let f=dragging
let gx=Math.round((f.x-FX)/CELL)
let gy=Math.round((f.y-FY)/CELL)
if(canPlaceOn(field,f.shape,gx,gy)){
f.shape.forEach(b=>field[gy+b[1]][gx+b[0]]=f.color)
score+=f.shape.length*10
best=Math.max(best,score)
localStorage.best=best
figures=figures.filter(x=>x!==f)
if(figures.length===0)spawnSet()
}else{
f.ty=f.homeY
f.scale=0.9
}
dragging=null
preview=[]
}

function loop(){draw();requestAnimationFrame(loop)}
init()
loop()
</script>