const c=document.getElementById("game")
const ctx=c.getContext("2d")

c.width=360
c.height=640

const GRID=8
const CELL=46
const FX=(360-GRID*CELL)/2
const FY=140
const FIELD_TOP=FY
const FIELD_BOTTOM=FY+GRID*CELL
const SPAWN_Y=FIELD_BOTTOM+24

const COLORS=["#FF8A80","#FFD180","#80D8FF","#A7FFEB","#B388FF","#FFAB91"]

const SHAPES=[
[[0,0]],[[0,0],[1,0]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[2,0],[3,0]],
[[0,0],[0,1]],[[0,0],[0,1],[0,2]],
[[0,0],[1,0],[0,1]],[[0,0],[1,0],[2,0],[1,1]],
[[0,0],[1,0],[0,1],[1,1]],
[[0,0],[1,0],[2,0],[0,1]],
[[0,0],[0,1],[1,1],[2,1]],
[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],
[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]
]

let field,figures,dragging,preview=[]
let score=0,visualScore=0
let best=+localStorage.best||0
let particles=[]
let comboText=null
let audioCtx
let paused=false
let showMenu=false
let showGameOver=false
let canContinue=true
let shapeHistory=[]

function bounds(s){
let w=0,h=0
s.forEach(b=>{w=Math.max(w,b[0]);h=Math.max(h,b[1])})
return{w:w+1,h:h+1}
}

function cloneField(f){return f.map(r=>r.slice())}

function canPlaceOn(f,s,x,y){
return s.every(b=>{
let nx=x+b[0],ny=y+b[1]
return nx>=0&&ny>=0&&nx<GRID&&ny<GRID&&!f[ny][nx]
})
}

function placeOn(f,s,x,y){s.forEach(b=>f[y+b[1]][x+b[0]]=1)}

function anyMoveOn(f,shapes){
for(let s of shapes)
for(let y=0;y<GRID;y++)
for(let x=0;x<GRID;x++)
if(canPlaceOn(f,s,x,y))return true
return false
}

function bestMoveExists(f,shapes){
for(let s of shapes)
for(let y=0;y<GRID;y++)
for(let x=0;x<GRID;x++)
if(canPlaceOn(f,s,x,y)){
let nf=cloneField(f)
placeOn(nf,s,x,y)
if(anyMoveOn(nf,shapes))return true
}
return false
}

function fillRatio(){
let c=0
for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++)if(field[y][x])c++
return c/(GRID*GRID)
}

function fitsAnywhere(s){
for(let y=0;y<GRID;y++)
for(let x=0;x<GRID;x++)
if(canPlaceOn(field,s,x,y))return true
return false
}

function generatePredictiveSet(){
let attempts=0
while(attempts++<10){
let used=[],set=[]
for(let i=0;i<3;i++){
let pool=SHAPES.filter(s=>fitsAnywhere(s))
if(!pool.length)pool=[SHAPES[0]]
let s
do{s=pool[Math.random()*pool.length|0]}while(used.includes(s))
used.push(s);set.push(s)
}
if(bestMoveExists(cloneField(field),set))return set
}
return [SHAPES[0],SHAPES[1],SHAPES[2]]
}

function spawnSet(){
figures=[]
const slots=[70,180,290]
let shapes=generatePredictiveSet()
for(let i=0;i<3;i++){
let s=shapes[i],b=bounds(s)
let w=b.w*CELL,h=b.h*CELL
figures.push({
shape:s,color:COLORS[Math.random()*COLORS.length|0],
homeX:slots[i]-w/2,homeY:SPAWN_Y-h,
x:slots[i]-w/2,y:700,tx:slots[i]-w/2,ty:SPAWN_Y-h,
vy:0,bounce:true,scale:0.7,idleScale:0.7,dragScale:0.5
})
}
}

function init(){
field=Array.from({length:GRID},()=>Array(GRID).fill(null))
figures=[];particles=[];preview=[]
score=0;visualScore=0;paused=false;showMenu=false;showGameOver=false
canContinue=true;shapeHistory=[]
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
ctx.fillStyle=col
rr(x,y,CELL,CELL,12)
ctx.fill()
ctx.fillStyle="rgba(255,255,255,.25)"
rr(x+6,y+6,CELL-12,6,4)
ctx.fill()
}

function draw(){
ctx.clearRect(0,0,c.width,c.height)

ctx.fillStyle="#111"
rr(FX-20,FY-20,GRID*CELL+40,GRID*CELL+40,32)
ctx.fill()
ctx.lineWidth=4
ctx.strokeStyle="#5DA9FF"
ctx.stroke()

for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
ctx.strokeStyle="#2a2a2a"
rr(FX+x*CELL,FY+y*CELL,CELL,CELL,12)
ctx.stroke()
if(field[y][x])drawBlock(FX+x*CELL,FY+y*CELL,field[y][x])
}

preview.forEach(p=>drawBlock(FX+p[0]*CELL,FY+p[1]*CELL,"rgba(255,255,255,.5)"))

figures.forEach(f=>{
f.x+=(f.tx-f.x)*0.8
if(f.bounce){
f.vy+=1.4;f.y+=f.vy
if(f.y>=f.ty){f.y=f.ty;f.vy*=-0.45;if(Math.abs(f.vy)<0.9){f.bounce=false;f.vy=0}}
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
ctx.fillStyle="#fff"
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
let r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top
if(mx>310&&my<60){showMenu=true;paused=true;return}
if(paused)return
figures.forEach(f=>{
let b=bounds(f.shape)
if(mx>f.x&&mx<f.x+b.w*CELL&&my>f.y&&my<f.y+b.h*CELL){
dragging=f;f.scale=1
}
})
}

c.onpointermove=e=>{
if(!dragging)return
let r=c.getBoundingClientRect()
dragging.tx=Math.max(0,Math.min(c.width-100,e.clientX-r.left-CELL/2))
dragging.ty=Math.max(0,Math.min(c.height-100,e.clientY-r.top-CELL))
preview=[]
let gx=Math.round((dragging.tx+CELL/2-FX)/CELL)
let gy=Math.round((dragging.ty+CELL/2-FY)/CELL)
if(canPlaceOn(field,dragging.shape,gx,gy)){
dragging.scale+= (1-dragging.scale)*0.3
dragging.shape.forEach(b=>preview.push([gx+b[0],gy+b[1]]))
}else dragging.scale+=(dragging.dragScale-dragging.scale)*0.3
}

c.onpointerup=()=>{
if(!dragging)return
let gx=Math.round((dragging.tx+CELL/2-FX)/CELL)
let gy=Math.round((dragging.ty+CELL/2-FY)/CELL)
if(canPlaceOn(field,dragging.shape,gx,gy)){
dragging.shape.forEach(b=>field[gy+b[1]][gx+b[0]]=dragging.color)
score+=dragging.shape.length*10
best=Math.max(best,score);localStorage.best=best
figures=figures.filter(x=>x!==dragging)
if(figures.length===0)spawnSet()
}else{
dragging.tx=dragging.homeX
dragging.ty=dragging.homeY
dragging.scale=dragging.idleScale
}
dragging=null;preview=[]
}

function loop(){draw();requestAnimationFrame(loop)}
init();loop()