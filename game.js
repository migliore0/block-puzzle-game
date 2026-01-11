const c=document.getElementById("game")
const ctx=c.getContext("2d")

c.width=360
c.height=640

const GRID=8
const CELL=46
const FX=(360-GRID*CELL)/2
const FY=140
const SPAWN_Y=560

const COLORS=["#F48B82","#F6D365","#8EC5FC","#9BE7C4","#C7B7E2","#F7B267"]

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
let shapeHistory=[]

function cloneField(src){
return src.map(r=>r.slice())
}

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

function placeOn(f,s,x,y){
s.forEach(b=>f[y+b[1]][x+b[0]]=1)
}

function anyMoveOn(f,shapes){
for(let s of shapes)
for(let y=0;y<GRID;y++)
for(let x=0;x<GRID;x++)
if(canPlaceOn(f,s,x,y))return true
return false
}

function bestMoveExists(f,shapes){
for(let s of shapes){
for(let y=0;y<GRID;y++){
for(let x=0;x<GRID;x++){
if(canPlaceOn(f,s,x,y)){
let nf=cloneField(f)
placeOn(nf,s,x,y)
if(anyMoveOn(nf,shapes))return true
}
}
}
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

function pickCandidateShapes(){
let fill=fillRatio()
let pool=SHAPES.filter(s=>fitsAnywhere(s))
if(!pool.length)pool=[SHAPES[0]]

pool=pool.filter(s=>!shapeHistory.includes(s)||Math.random()<0.25)

let nearLose=fill>0.78
if(nearLose){
pool=pool.sort((a,b)=>{
let sa=bounds(a).w*bounds(a).h
let sb=bounds(b).w*bounds(b).h
return sa-sb
}).slice(0,3)
}else{
pool=pool.filter(s=>{
let size=bounds(s).w*bounds(s).h
if(fill<0.35)return size>=4
if(fill<0.65)return size<=6
return size<=3
})
}

return pool
}

function generatePredictiveSet(){
let attempts=0
while(attempts++<12){
let used=[]
let set=[]
for(let i=0;i<3;i++){
let pool=pickCandidateShapes()
let s
do{s=pool[Math.random()*pool.length|0]}while(used.includes(s))
used.push(s)
set.push(s)
}
if(bestMoveExists(cloneField(field),set)){
shapeHistory.push(...set)
shapeHistory=shapeHistory.slice(-5)
return set
}
}
return [SHAPES[0],SHAPES[1],SHAPES[2]]
}

function spawnSet(){
figures=[]
const slots=[70,180,290]
let shapes=generatePredictiveSet()
for(let i=0;i<3;i++){
let s=shapes[i]
let b=bounds(s)
let w=b.w*CELL
let h=b.h*CELL
figures.push({
shape:s,
color:COLORS[Math.random()*COLORS.length|0],
homeX:slots[i]-w/2,
homeY:SPAWN_Y-h,
x:slots[i]-w/2,
y:700,
tx:slots[i]-w/2,
ty:SPAWN_Y-h,
vy:0,
bounce:true,
scale:0.75,
idleScale:0.75,
dragScale:0.45
})
}
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
shapeHistory=[]
spawnSet()
}

function audio(){
if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)()
}

function sound(f,d=0.07,v=0.12){
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
ctx.fillStyle="rgba(0,0,0,.35)"
rr(x+3,y+5,CELL-6,CELL-6,10)
ctx.fill()
ctx.fillStyle=col
rr(x,y,CELL-6,CELL-6,10)
ctx.fill()
ctx.fillStyle="rgba(255,255,255,.25)"
rr(x+6,y+6,CELL-20,6,4)
ctx.fill()
}

function canPlace(s,gx,gy){
return canPlaceOn(field,s,gx,gy)
}

function spawnParticles(x,y,col,count=10){
for(let i=0;i<count;i++){
particles.push({
x:x+CELL/2,
y:y+CELL/2,
vx:(Math.random()-.5)*4,
vy:(Math.random()-.8)*4,
life:30,
c:col
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
score+=cleared>1?cleared*150:100
comboText={t:"COMBO x"+cleared,a:60}
sound(220+cleared*60,0.12,0.16)
}

function draw(){
ctx.clearRect(0,0,360,640)
ctx.fillStyle="#111"
rr(FX-14,FY-14,GRID*CELL+28,GRID*CELL+28,26)
ctx.fill()

for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
ctx.strokeStyle="#2a2a2a"
rr(FX+x*CELL,FY+y*CELL,CELL,CELL,10)
ctx.stroke()
if(field[y][x])drawBlock(FX+x*CELL,FY+y*CELL,field[y][x])
}

preview.forEach(p=>{
ctx.globalAlpha=.5
drawBlock(FX+p[0]*CELL,FY+p[1]*CELL,"#fff")
ctx.globalAlpha=1
})

figures.forEach(f=>{
f.x+=(f.tx-f.x)*0.8
if(f.bounce){
f.vy+=1.3
f.y+=f.vy
if(f.y>=f.ty){
f.y=f.ty
f.vy*=-0.45
if(Math.abs(f.vy)<0.9){f.bounce=false;f.vy=0}
}
}else{
f.y+=(f.ty-f.y)*0.8
}
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

if(comboText){
ctx.font="20px Arial"
ctx.fillStyle="rgba(255,255,255,"+(comboText.a/60)+")"
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
}

c.onpointerdown=e=>{
audio()
let r=c.getBoundingClientRect()
let mx=e.clientX-r.left,my=e.clientY-r.top
figures.forEach(f=>{
let b=bounds(f.shape)
if(mx>f.x&&mx<f.x+b.w*CELL&&my>f.y&&my<f.y+b.h*CELL){
dragging=f
f.scale=f.dragScale
sound(520)
}
})
}

c.onpointermove=e=>{
if(!dragging)return
let r=c.getBoundingClientRect()
dragging.tx=e.clientX-r.left-CELL/2
dragging.ty=e.clientY-r.top-CELL*1.5
preview=[]
let gx=Math.round((dragging.tx+CELL/2-FX)/CELL)
let gy=Math.round((dragging.ty+CELL/2-FY)/CELL)
if(canPlace(dragging.shape,gx,gy))
dragging.shape.forEach(b=>preview.push([gx+b[0],gy+b[1]]))
}

c.onpointerup=()=>{
if(!dragging)return
let f=dragging
let gx=Math.round((f.tx+CELL/2-FX)/CELL)
let gy=Math.round((f.ty+CELL/2-FY)/CELL)
if(canPlace(f.shape,gx,gy)){
f.shape.forEach(b=>{
field[gy+b[1]][gx+b[0]]=f.color
spawnParticles(FX+(gx+b[0])*CELL,FY+(gy+b[1])*CELL,f.color,6)
})
score+=f.shape.length*10
best=Math.max(best,score)
localStorage.best=best
figures=figures.filter(x=>x!==f)
clearLines()
if(figures.length===0)spawnSet()
}else{
f.tx=f.homeX
f.ty=f.homeY
f.scale=f.idleScale
}
dragging=null
preview=[]
}

function loop(){draw();requestAnimationFrame(loop)}
init()
loop()