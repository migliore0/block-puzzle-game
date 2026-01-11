const c=document.getElementById("game"),ctx=c.getContext("2d")
c.width=360;c.height=640

let ysdk=null
YaGames.init().then(s=>ysdk=s)

const G=8,S=42,FX=(360-G*S)/2,FY=140
const COLORS=["#F44336","#FFD54F","#42A5F5","#66BB6A","#AB47BC","#FF9800"]

const SHAPES=[
[[0,0]],
[[0,0],[1,0]],
[[0,0],[0,1]],
[[0,0],[1,0],[2,0]],
[[0,0],[0,1],[0,2]],
[[0,0],[1,0],[0,1]],
[[0,0],[1,0],[2,0],[3,0]],
[[0,0],[0,1],[0,2],[0,3]],
[[0,0],[1,0],[0,1],[1,1]],
[[0,0],[1,0],[2,0],[1,1]],
[[0,0],[0,1],[0,2],[1,2]],
[[0,0],[1,0],[2,0],[3,0],[4,0]],
[[0,0],[0,1],[0,2],[0,3],[0,4]]
]

let field=Array.from({length:G},()=>Array(G).fill(null))
let shapes=[],drag=null
let score=0,best=+localStorage.best||0,combo=0,over=false,lastAd=0
let clears=[]
let lastChanceUsed=false

function rr(x,y,w,h,r){
ctx.beginPath()
ctx.moveTo(x+r,y)
ctx.arcTo(x+w,y,x+w,y+h,r)
ctx.arcTo(x+w,y+h,x,y+h,r)
ctx.arcTo(x,y+h,x,y,r)
ctx.arcTo(x,y,x+w,y,r)
ctx.closePath()
}

function drawBlock(px,py,col,a=1,s=1){
ctx.save()
ctx.globalAlpha=a
ctx.translate(px+S/2,py+S/2)
ctx.scale(s,s)
ctx.translate(-S/2,-S/2)
ctx.fillStyle="rgba(0,0,0,.35)"
ctx.fillRect(3,5,S-3,S-3)
ctx.fillStyle=col
rr(0,0,S-4,S-4,7)
ctx.fill()
ctx.fillStyle="rgba(255,255,255,.18)"
ctx.fillRect(6,6,S-16,6)
ctx.restore()
}

function fits(shape){
let out=[]
for(let y=0;y<G;y++)for(let x=0;x<G;x++){
if(shape.every(b=>{
let nx=x+b[0],ny=y+b[1]
return nx>=0&&ny>=0&&nx<G&&ny<G&&!field[ny][nx]
}))out.push([x,y])
}
return out
}

function fieldFill(){
let f=0
for(let y=0;y<G;y++)for(let x=0;x<G;x++)if(field[y][x])f++
return f/(G*G)
}

function totalMoves(){
let m=0
SHAPES.forEach(s=>m+=fits(s).length)
return m
}

function pickShape(){
let fill=fieldFill()
let moves=totalMoves()

let fitting=SHAPES.filter(s=>fits(s).length)
let random=()=>SHAPES[Math.random()*SHAPES.length|0]

if(moves<=1 && fitting.length && !lastChanceUsed){
lastChanceUsed=true
return fitting[Math.random()*fitting.length|0]
}

if(fill>0.55){
if(Math.random()<0.4 && fitting.length) return fitting[Math.random()*fitting.length|0]
return random()
}

if(fitting.length && Math.random()<0.7) return fitting[Math.random()*fitting.length|0]
return random()
}

function spawn(extra=false){
if(!extra){shapes=[];lastChanceUsed=false}
let n=extra?1:3
for(let i=0;i<n;i++)shapes.push({
shape:pickShape(),
color:COLORS[Math.random()*COLORS.length|0],
x:60+shapes.length*110,
y:520
})
}

function place(s,gx,gy){
s.shape.forEach(b=>field[gy+b[1]][gx+b[0]]={c:s.color})
score+=s.shape.length*10
clearLines()
if(score>best){best=score;localStorage.best=best}
navigator.vibrate&&navigator.vibrate(15)
}

function clearLines(){
let hit=[]
for(let y=0;y<G;y++)if(field[y].every(v=>v))hit.push(["r",y])
for(let x=0;x<G;x++){
let ok=true
for(let y=0;y<G;y++)if(!field[y][x])ok=false
ok&&hit.push(["c",x])
}
if(hit.length){
combo++
score+=hit.length*120*combo
hit.forEach(h=>{
if(h[0]=="r")for(let x=0;x<G;x++)clears.push({x,y:h[1],t:0})
if(h[0]=="c")for(let y=0;y<G;y++)clears.push({x:h[1],y,t:0})
})
}else combo=0
}

function updateClears(){
clears=clears.filter(o=>{
o.t+=0.15
if(o.t>=1){field[o.y][o.x]=null;return false}
return true
})
}

function hasMoves(){
return shapes.some(s=>fits(s.shape).length)
}

function draw(){
ctx.clearRect(0,0,c.width,c.height)
ctx.fillStyle="#111"
rr(FX-6,FY-6,G*S+12,G*S+12,16)
ctx.fill()

for(let y=0;y<G;y++)for(let x=0;x<G;x++){
let b=field[y][x]
if(b)drawBlock(FX+x*S,FY+y*S,b.c)
}

clears.forEach(o=>{
let a=1-o.t
let s=1-o.t*0.15
drawBlock(FX+o.x*S,FY+o.y*S,"#fff",a,s)
})

ctx.fillStyle="#fff"
ctx.textAlign="center"
ctx.font="600 34px Arial"
ctx.fillText(score,c.width/2,80)
ctx.font="14px Arial"
ctx.fillText("BEST "+best,c.width/2,105)
if(combo>1)ctx.fillText("COMBO x"+combo,c.width/2,125)

shapes.forEach(s=>s.shape.forEach(b=>{
drawBlock(s.x+b[0]*S,s.y+b[1]*S,s.color)
}))

if(over){
ctx.fillStyle="rgba(0,0,0,.6)"
ctx.fillRect(0,0,c.width,c.height)
ctx.fillStyle="#fff"
ctx.font="700 30px Arial"
ctx.fillText("GAME OVER",c.width/2,300)
ctx.font="18px Arial"
ctx.fillText("Продолжить за рекламу",c.width/2,340)
}
}

c.onpointerdown=e=>{
if(over){
ysdk&&ysdk.adv.showRewardedVideo({callbacks:{onReward:()=>{over=false;spawn(true)}}})
return
}
let r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top
shapes.forEach(s=>s.shape.forEach(b=>{
let px=s.x+b[0]*S,py=s.y+b[1]*S
if(mx>px&&mx<px+S&&my>py&&my<py+S)drag={s,ox:mx-s.x,oy:my-s.y}
}))
}

c.onpointermove=e=>{
if(!drag)return
let r=c.getBoundingClientRect()
drag.s.x=e.clientX-r.left-drag.ox
drag.s.y=e.clientY-r.top-drag.oy
}

c.onpointerup=()=>{
if(!drag)return
let gx=Math.round((drag.s.x-FX)/S),gy=Math.round((drag.s.y-FY)/S)
if(fits(drag.s.shape).some(p=>p[0]==gx&&p[1]==gy)){
place(drag.s,gx,gy)
shapes=shapes.filter(q=>q!==drag.s)
if(!shapes.length)spawn()
}else drag.s.y=520
drag=null
if(!hasMoves())end()
}

function end(){
over=true
combo=0
ysdk&&Date.now()-lastAd>90000&&ysdk.adv.showFullscreenAdv({callbacks:{onClose:()=>lastAd=Date.now()}})
}

function loop(){
updateClears()
draw()
requestAnimationFrame(loop)
}

spawn()
loop()