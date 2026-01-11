const c=document.getElementById("game")
const ctx=c.getContext("2d")

c.width=360
c.height=640

const GRID=8
const CELL=42
const FX=(360-GRID*CELL)/2
const FY=140

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
rr(x+4,y+6,CELL-8,CELL-8,8)
ctx.fill()
ctx.fillStyle=col
rr(x,y,CELL-8,CELL-8,8)
ctx.fill()
ctx.fillStyle="rgba(255,255,255,.25)"
rr(x+6,y+6,CELL-20,6,4)
ctx.fill()
}

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

function anyMoves(){
for(let f of figures)
for(let y=0;y<GRID;y++)
for(let x=0;x<GRID;x++)
if(canPlace(f.shape,x,y))return true
return false
}

function spawnSet(){
figures=[]
const slots=[60,180,300]
for(let i=0;i<3;i++){
let s=SHAPES[Math.random()*SHAPES.length|0]
let b=bounds(s)
let w=b.w*CELL*0.9
let h=b.h*CELL*0.9
figures.push({
shape:s,
color:COLORS[Math.random()*COLORS.length|0],
x:slots[i]-w/2,
y:700,
tx:slots[i]-w/2,
ty:560-h,
vy:0,
bounce:true,
scale:0.9
})
}
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
rr(FX-14,FY-14,GRID*CELL+28,GRID*CELL+28,24)
ctx.fill()

for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
ctx.strokeStyle="#2a2a2a"
rr(FX+x*CELL,FY+y*CELL,CELL,CELL,8)
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
f.vy+=1.2
f.y+=f.vy
if(f.y>=f.ty){
f.y=f.ty
f.vy*=-0.45
if(Math.abs(f.vy)<0.8){f.bounce=false;f.vy=0}
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

ctx.font="26px Arial"
ctx.textAlign="right"
ctx.fillText("⚙",350,40)

if(showMenu||showGameOver){
ctx.fillStyle="rgba(0,0,0,.75)"
ctx.fillRect(0,0,360,640)
ctx.fillStyle="#fff"
ctx.textAlign="center"
ctx.font="700 32px Arial"
ctx.fillText(showGameOver?"GAME OVER":"PAUSE",180,220)
ctx.font="22px Arial"
if(showGameOver){
if(canContinue)ctx.fillText("▶ Continue",180,300)
ctx.fillText("🔁 Restart",180,350)
}else{
ctx.fillText("▶ Restart",180,300)
ctx.fillText("✕ Close",180,350)
}
}
}

c.onpointerdown=e=>{
audio()
let r=c.getBoundingClientRect()
let mx=e.clientX-r.left,my=e.clientY-r.top

if(mx>310&&my<60){
showMenu=true
paused=true
return
}

if(showMenu){
if(my>280&&my<320)init()
if(my>330&&my<380){showMenu=false;paused=false}
return
}

if(showGameOver){
if(canContinue&&my>280&&my<320){
canContinue=false
showGameOver=false
paused=false
let y=Math.random()*GRID|0
for(let x=0;x<GRID;x++)field[y][x]=null
figures=[{
shape:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
color:COLORS[Math.random()*COLORS.length|0],
x:120,y:520,tx:120,ty:520,scale:0.9
}]
}
if(my>330&&my<380)init()
return
}

if(paused)return

figures.forEach(f=>{
let b=bounds(f.shape)
if(mx>f.x&&mx<f.x+b.w*CELL&&my>f.y&&my<f.y+b.h*CELL){
dragging=f
f.scale=1
sound(520)
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
if(canPlace(dragging.shape,gx,gy))
dragging.shape.forEach(b=>preview.push([gx+b[0],gy+b[1]]))
}

c.onpointerup=()=>{
if(!dragging||paused)return
let f=dragging
let gx=Math.round((f.x-FX)/CELL)
let gy=Math.round((f.y-FY)/CELL)
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
if(!anyMoves()){
showGameOver=true
paused=true
}
}else{
let b=bounds(f.shape)
f.ty=560-b.h*CELL*0.9
f.scale=0.9
}
dragging=null
preview=[]
}

function loop(){draw();requestAnimationFrame(loop)}
init()
loop()