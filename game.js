const c=document.getElementById("game"),x=c.getContext("2d")
c.width=360;c.height=640

let ysdk=null
YaGames.init().then(s=>ysdk=s)

const G=8,S=42,FX=(360-G*S)/2,FY=140
const COLORS=["#F28B82","#A7C7E7","#A8D5BA","#F7D046","#C3AED6","#F5B971"]

const SHAPES=[
[[0,0]],
[[0,0],[1,0]],
[[0,0],[1,0],[2,0]],
[[0,0],[0,1],[1,1]],
[[0,0],[1,0],[2,0],[3,0]],
[[0,0],[0,1],[0,2],[0,3]],
[[0,0],[1,0],[0,1],[1,1]],
[[0,0],[1,0],[2,0],[1,1]],
[[0,0],[0,1],[0,2],[1,2]],
[[0,0],[1,0],[2,0],[3,0],[4,0]],
[[0,0],[0,1],[0,2],[0,3],[0,4]],
[[0,1],[1,1],[2,1],[1,0],[1,2]]
]

let field=Array.from({length:G},()=>Array(G).fill(null))
let shapes=[],drag=null
let score=0,best=+localStorage.best||0,combo=0,over=false,lastAd=0

function rr(px,py,w,h,r){
x.beginPath()
x.moveTo(px+r,py)
x.arcTo(px+w,py,px+w,py+h,r)
x.arcTo(px+w,py+h,px,py+h,r)
x.arcTo(px,py+h,px,py,r)
x.arcTo(px,py,px+w,py,r)
x.closePath()
}

function block(px,py,col,a=1){
x.globalAlpha=a
x.fillStyle="rgba(0,0,0,.35)"
x.fillRect(px+3,py+5,S-3,S-3)
x.fillStyle=col
rr(px,py,S-4,S-4,7)
x.fill()
x.fillStyle="rgba(255,255,255,.18)"
x.fillRect(px+6,py+6,S-16,6)
x.globalAlpha=1
}

function draw(){
x.clearRect(0,0,c.width,c.height)
x.fillStyle="#111"
rr(FX-6,FY-6,G*S+12,G*S+12,16)
x.fill()

for(let y=0;y<G;y++)for(let z=0;z<G;z++)if(field[y][z])block(FX+z*S,FY+y*S,field[y][z])

x.fillStyle="#fff"
x.textAlign="center"
x.font="600 34px Arial"
x.fillText(score,c.width/2,80)
x.font="14px Arial"
x.fillText("BEST "+best,c.width/2,105)
if(combo>1)x.fillText("COMBO x"+combo,c.width/2,125)

shapes.forEach(s=>s.shape.forEach(b=>block(s.x+b[0]*S,s.y+b[1]*S,s.color)))

if(over){
x.fillStyle="rgba(0,0,0,.6)"
x.fillRect(0,0,c.width,c.height)
x.fillStyle="#fff"
x.font="700 30px Arial"
x.fillText("GAME OVER",c.width/2,300)
x.font="18px Arial"
x.fillText("Продолжить за рекламу",c.width/2,340)
x.fillText("Нажми",c.width/2,365)
}
}

function fits(shape){
let ok=[]
for(let y=0;y<G;y++)for(let x0=0;x0<G;x0++){
if(shape.every(b=>{
let x=x0+b[0],y0=y+b[1]
return x>=0&&y0>=0&&x<G&&y0<G&&!field[y0][x]
}))ok.push([x0,y])
}
return ok
}

function smartShape(){
let good=[]
SHAPES.forEach(s=>{if(fits(s).length)good.push(s)})
if(good.length&&Math.random()<0.7)return good[Math.random()*good.length|0]
return SHAPES[Math.random()*SHAPES.length|0]
}

function spawn(extra=false){
if(!extra)shapes=[]
let count=extra?1:3
for(let i=0;i<count;i++)shapes.push({
shape:smartShape(),
color:COLORS[Math.random()*COLORS.length|0],
x:60+(shapes.length)*110,
y:520
})
}

function place(s,gx,gy){
s.shape.forEach(b=>field[gy+b[1]][gx+b[0]]=s.color)
score+=s.shape.length*10
clearLines()
if(score>best){best=score;localStorage.best=best}
navigator.vibrate&&navigator.vibrate(20)
}

function clearLines(){
let c0=0
for(let y=0;y<G;y++)if(field[y].every(v=>v)){field[y].fill(null);c0++}
for(let x0=0;x0<G;x0++){
let f=true
for(let y=0;y<G;y++)if(!field[y][x0])f=false
if(f){for(let y=0;y<G;y++)field[y][x0]=null;c0++}
}
combo=c0?combo+1:0
if(c0)score+=c0*120*combo
}

function hasMoves(){
return shapes.some(s=>fits(s.shape).length)
}

c.onpointerdown=e=>{
if(over){
if(ysdk){
ysdk.adv.showRewardedVideo({
callbacks:{
onReward:()=>{
over=false
spawn(true)
draw()
},
onClose:()=>{}
}
})
}
return
}
const r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top
shapes.forEach(s=>s.shape.forEach(b=>{
let px=s.x+b[0]*S,py=s.y+b[1]*S
if(mx>px&&mx<px+S&&my>py&&my<py+S)drag={s,ox:mx-s.x,oy:my-s.y}
}))
}

c.onpointermove=e=>{
if(!drag)return
const r=c.getBoundingClientRect()
drag.s.x=e.clientX-r.left-drag.ox
drag.s.y=e.clientY-r.top-drag.oy
draw()
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
draw()
}

function end(){
over=true
combo=0
if(ysdk&&Date.now()-lastAd>90000){
ysdk.adv.showFullscreenAdv({callbacks:{onClose:()=>lastAd=Date.now()}})
}
}

spawn()
draw()
